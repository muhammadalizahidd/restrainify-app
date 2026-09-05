if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/home/legitahmad/.gradle/caches/9.4.1/transforms/33615193014b0d25be1026a84ee78bc4/transformed/hermes-android-250829098.0.17-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/legitahmad/.gradle/caches/9.4.1/transforms/33615193014b0d25be1026a84ee78bc4/transformed/hermes-android-250829098.0.17-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

