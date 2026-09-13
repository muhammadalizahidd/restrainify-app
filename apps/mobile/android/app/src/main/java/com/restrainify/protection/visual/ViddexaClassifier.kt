package com.restrainify.protection.visual

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import org.json.JSONObject
import java.io.Closeable
import java.nio.FloatBuffer
import kotlin.math.exp

/**
 * ONNX wrapper for the exported Viddexa model. Preprocessing comes from the
 * export manifest produced by tools/export_viddexa.py; it is never guessed in app code.
 */
class ViddexaClassifier(context: Context) : Closeable {
    private val manifest = ViddexaModelManifest.load(context)
    private val environment = OrtEnvironment.getEnvironment()
    private val sessionOptions = OrtSession.SessionOptions()
    private val session = context.assets.open(manifest.modelAsset).use { environment.createSession(it.readBytes(), sessionOptions) }
    private val inputName = session.inputNames.single()

    fun classify(bitmap: Bitmap): ClassifierResult {
        val started = SystemClock.elapsedRealtime()
        val tensorBuffer = FloatBuffer.wrap(preprocess(bitmap))
        OnnxTensor.createTensor(environment, tensorBuffer, longArrayOf(1, 3, manifest.cropHeight.toLong(), manifest.cropWidth.toLong())).use { input ->
            session.run(mapOf(inputName to input)).use { result ->
                @Suppress("UNCHECKED_CAST")
                val logits = (result[0].value as Array<FloatArray>)[0]
                require(logits.size == 5) { "Viddexa export returned ${logits.size} classes, expected 5." }
                val scores = softmax(logits)
                // Published Viddexa index order: safe/normal, hentai, porn, sexy, drawing.
                return ClassifierResult(scores[0], scores[3], scores[2], scores[1], scores[4], SystemClock.elapsedRealtime() - started)
            }
        }
    }

    private fun preprocess(source: Bitmap): FloatArray {
        // Viddexa's checked-in processor uses nearest-neighbor resize (`resample: 0`).
        val resized = Bitmap.createScaledBitmap(source, manifest.resizeWidth, manifest.resizeHeight, false)
        val cropped = if (manifest.centerCrop) {
            val left = (resized.width - manifest.cropWidth) / 2
            val top = (resized.height - manifest.cropHeight) / 2
            Bitmap.createBitmap(resized, left, top, manifest.cropWidth, manifest.cropHeight)
        } else resized
        try {
            val pixels = IntArray(manifest.cropWidth * manifest.cropHeight)
            cropped.getPixels(pixels, 0, manifest.cropWidth, 0, 0, manifest.cropWidth, manifest.cropHeight)
            val plane = manifest.cropWidth * manifest.cropHeight
            return FloatArray(plane * 3).also { values ->
                pixels.forEachIndexed { index, pixel ->
                    val channels = floatArrayOf((pixel shr 16 and 0xff).toFloat(), (pixel shr 8 and 0xff).toFloat(), (pixel and 0xff).toFloat())
                    for (channel in 0..2) values[channel * plane + index] = (channels[channel] * manifest.rescaleFactor - manifest.mean[channel]) / manifest.std[channel]
                }
            }
        } finally {
            if (cropped !== resized) cropped.recycle()
            resized.recycle()
        }
    }

    private fun softmax(logits: FloatArray): FloatArray {
        val max = logits.max()
        val unnormalized = logits.map { exp((it - max).toDouble()).toFloat() }
        val sum = unnormalized.sum()
        return FloatArray(logits.size) { unnormalized[it] / sum }
    }

    override fun close() { session.close(); sessionOptions.close() }
}

private data class ViddexaModelManifest(
    val modelAsset: String,
    val resizeWidth: Int,
    val resizeHeight: Int,
    val cropWidth: Int,
    val cropHeight: Int,
    val centerCrop: Boolean,
    val rescaleFactor: Float,
    val mean: FloatArray,
    val std: FloatArray,
) {
    companion object {
        private const val assetName = "models/viddexa_nsfw_2_nano_manifest.json"
        fun load(context: Context): ViddexaModelManifest {
            val json = context.assets.open(assetName).bufferedReader().use { JSONObject(it.readText()) }
            fun dimensions(key: String): IntArray = json.getJSONObject(key).let { intArrayOf(it.getInt("width"), it.getInt("height")) }
            fun numbers(key: String): FloatArray = json.getJSONArray(key).let { array -> FloatArray(array.length()) { array.getDouble(it).toFloat() } }
            val resize = dimensions("resize")
            val crop = dimensions("centerCrop")
            val centerCrop = json.getJSONObject("centerCrop").optBoolean("enabled", true)
            return ViddexaModelManifest(json.getString("modelAsset"), resize[0], resize[1], crop[0], crop[1], centerCrop, json.getDouble("rescaleFactor").toFloat(), numbers("imageMean"), numbers("imageStd")).also {
                require(it.mean.size == 3 && it.std.size == 3) { "Viddexa manifest must declare RGB mean and std values." }
                require(it.resizeWidth >= it.cropWidth && it.resizeHeight >= it.cropHeight) { "Viddexa manifest resize must contain its crop." }
            }
        }
    }
}
