{
  'make_global_settings': [
    ['CXX','/usr/bin/clang++'],
    ['LINK','/usr/bin/clang++'],
  ],
  "targets": [
    {
    "target_name": "hello",
    "sources": [ "../Native/CPU.cpp", "../Native/Definitions.cpp", "../Native/main.cpp", "../Native/Utilities.cpp" ],
    "defines": [ "_bk_nodejs" ],
    "cflags": [
        "-std=c++11"
      ]
    }
  ]
}