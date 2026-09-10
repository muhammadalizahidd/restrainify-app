package com.restrainify.protection.storage

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.room.*
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@Entity(tableName = "configuration")
data class Configuration(@PrimaryKey val id: Int = 1, val payload: String)

@Entity(tableName = "events", indices = [Index("day"), Index("kind")])
data class LocalEvent(@PrimaryKey val id: String, val kind: String, val timestamp: Long, val day: String, val note: String, val resisted: Boolean = false)

@Entity(tableName = "daily")
data class DailyRecord(@PrimaryKey val day: String, val reward: Boolean = false, val blocked: Int = 0, val usageMs: Long = 0)

@Dao
interface ProtectionDao {
    @Query("SELECT * FROM configuration WHERE id = 1") fun configuration(): Configuration?
    @Insert(onConflict = OnConflictStrategy.REPLACE) fun configuration(value: Configuration)
    @Query("SELECT * FROM events ORDER BY timestamp DESC LIMIT 500") fun events(): List<LocalEvent>
    @Query("SELECT * FROM events WHERE kind = :kind ORDER BY timestamp") fun eventsOfKind(kind: String): List<LocalEvent>
    @Insert(onConflict = OnConflictStrategy.ABORT) fun event(value: LocalEvent)
    @Query("UPDATE events SET resisted = 1 WHERE id = :id AND kind IN ('urge', 'burst')") fun resist(id: String): Int
    @Query("SELECT * FROM daily ORDER BY day DESC") fun days(): List<DailyRecord>
    @Query("SELECT * FROM daily WHERE day = :day") fun day(day: String): DailyRecord?
    @Insert(onConflict = OnConflictStrategy.REPLACE) fun day(value: DailyRecord)
    @Query("DELETE FROM events") fun clearEvents()
    @Query("DELETE FROM daily") fun clearDays()
    @Query("DELETE FROM configuration") fun clearConfiguration()
}

@Database(entities = [Configuration::class, LocalEvent::class, DailyRecord::class], version = 1, exportSchema = true)
abstract class ProtectionDatabase : RoomDatabase() {
    abstract fun records(): ProtectionDao
    companion object {
        fun open(context: Context): ProtectionDatabase {
            System.loadLibrary("sqlcipher")
            return Room.databaseBuilder(context, ProtectionDatabase::class.java, "restrainify.db")
                .openHelperFactory(SupportOpenHelperFactory(databaseKey(context))).build()
        }

        private fun databaseKey(context: Context): ByteArray {
            val alias = "restrainify.database.v1"
            val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            val preferences = context.getSharedPreferences("database-key", Context.MODE_PRIVATE)
            val wrapped = preferences.getString("wrapped", null)
            // Never replace a missing key for an existing database: that would hide unrecoverable data.
            check(wrapped == null || store.containsAlias(alias)) { "Encrypted data key is unavailable" }
            val key = if (store.containsAlias(alias)) store.getKey(alias, null) as SecretKey else {
                check(!context.getDatabasePath("restrainify.db").exists()) { "Database key is unavailable" }
                KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
                    init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
                }.generateKey()
            }
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            if (wrapped != null) {
                val iv = Base64.decode(preferences.getString("iv", null), Base64.NO_WRAP)
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
                return cipher.doFinal(Base64.decode(wrapped, Base64.NO_WRAP))
            }
            check(!context.getDatabasePath("restrainify.db").exists()) { "Database key is unavailable" }
            val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
            cipher.init(Cipher.ENCRYPT_MODE, key)
            val encrypted = cipher.doFinal(bytes)
            check(preferences.edit().putString("wrapped", Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP)).commit()) { "Cannot persist encryption key" }
            return bytes
        }
    }
}
