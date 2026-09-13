package com.restrainify.protection.visual

import android.content.Context
import android.content.res.AssetFileDescriptor
import android.graphics.Bitmap
import android.os.SystemClock
import org.tensorflow.lite.Interpreter
import java.io.Closeable
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * Official GantMan v1.1.0 MobileNetV2 TFLite model. Its 224x224 float input is
 * NHWC RGB rescaled to [0, 1]; output order is drawings, hentai, neutral, porn, sexy.
 */
class NsfwJsMobileNetV2Classifier(context: Context) : Closeable {
    private val interpreter = Interpreter(loadModel(context))

    fun classify(source: Bitmap): ClassifierResult {
        val started = SystemClock.elapsedRealtime()
        val resized = Bitmap.createScaledBitmap(source, INPUT_SIZE, INPUT_SIZE, true)
        try {
            val input = ByteBuffer.allocateDirect(INPUT_SIZE * INPUT_SIZE * CHANNELS * Float.SIZE_BYTES).order(ByteOrder.nativeOrder())
            val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
            resized.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)
            pixels.forEach { pixel ->
                input.putFloat((pixel shr 16 and 0xff) / 255f)
                input.putFloat((pixel shr 8 and 0xff) / 255f)
                input.putFloat((pixel and 0xff) / 255f)
            }
            input.rewind()
            val output = Array(1) { FloatArray(CLASS_COUNT) }
            interpreter.run(input, output)
            val scores = output[0]
            require(scores.size == CLASS_COUNT) { "NSFWJS MobileNetV2 returned ${scores.size} classes, expected $CLASS_COUNT." }
            return ClassifierResult(
                normal = scores[2],
                sexy = scores[4],
                porn = scores[3],
                hentai = scores[1],
                drawing = scores[0],
                inferenceMs = SystemClock.elapsedRealtime() - started,
            )
        } finally { resized.recycle() }
    }

    override fun close() = interpreter.close()

    private fun loadModel(context: Context): MappedByteBuffer {
        val descriptor: AssetFileDescriptor = context.assets.openFd(MODEL_ASSET)
        descriptor.use {
            return FileInputStream(it.fileDescriptor).channel.map(FileChannel.MapMode.READ_ONLY, it.startOffset, it.declaredLength)
        }
    }

    private companion object {
        const val MODEL_ASSET = "models/nsfw_mobilenet_v2_140_224.tflite"
        const val INPUT_SIZE = 224
        const val CHANNELS = 3
        const val CLASS_COUNT = 5
    }
}
