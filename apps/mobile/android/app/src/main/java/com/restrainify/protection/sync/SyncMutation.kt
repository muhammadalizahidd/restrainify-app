package com.restrainify.protection.sync

data class SyncMutation(
    val mutationId: String,
    val entityId: String,
    val operation: SyncOperation,
    val schemaVersion: String,
    val clientUpdatedAt: String,
    val payloadJson: String
)

enum class SyncOperation {
    CREATE,
    UPDATE,
    DELETE
}

