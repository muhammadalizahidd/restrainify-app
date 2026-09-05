if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/home/legitahmad/.gradle/caches/9.3.1/transforms/ac804f2b95b14e41a04ff0203d1be5e7/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/legitahmad/.gradle/caches/9.3.1/transforms/ac804f2b95b14e41a04ff0203d1be5e7/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

