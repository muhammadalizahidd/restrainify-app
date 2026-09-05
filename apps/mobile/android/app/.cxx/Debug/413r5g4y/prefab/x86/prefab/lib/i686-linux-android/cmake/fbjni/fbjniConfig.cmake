if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/home/legitahmad/.gradle/caches/9.4.1/transforms/8a3e8a9038ec4194d90c2409e612a2a9/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.x86/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/legitahmad/.gradle/caches/9.4.1/transforms/8a3e8a9038ec4194d90c2409e612a2a9/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

