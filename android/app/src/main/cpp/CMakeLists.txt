cmake_minimum_required(VERSION 3.22.1)

project("llamacpp_jni")

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Strictly target multi-threaded CPU execution using ARMv8.5-a dot product instructions
# This avoids the Snapdragon's shared memory bus GPU bottleneck
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -march=armv8.5-a+dotprod -mtune=cortex-a78 -fopenmp -pthread")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O3 -march=armv8.5-a+dotprod -mtune=cortex-a78 -fopenmp -pthread")

# Add the JNI library
add_library(
        llamacpp_jni
        SHARED
        llamacpp_jni.cpp
)

# Find the log library
find_library(
        log-lib
        log
)

# Link libraries
target_link_libraries(
        llamacpp_jni
        ${log-lib}
)
