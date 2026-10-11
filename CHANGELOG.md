# Changelog

## [0.2.0](https://github.com/MovieMaker93/SparklingKit/compare/v0.1.5...v0.2.0) (2026-10-11)


### Features

* **asr:** add a Parakeet adapter with the OpenAI transcription route ([e580db2](https://github.com/MovieMaker93/SparklingKit/commit/e580db29ca98e2fee96aa3764f8f6fb3ba55fa16))
* **asr:** build sentences, subtitle cues and paragraphs from word timestamps ([ce40368](https://github.com/MovieMaker93/SparklingKit/commit/ce4036817bc88d00bf1f0d6e312952308b444786))
* **asr:** make Parakeet the default speech recognition backend ([93b2361](https://github.com/MovieMaker93/SparklingKit/commit/93b2361a06a8fb042b5c5cb4c341d017a7f47107))
* **asr:** package parakeet.cpp for the DGX Spark ([4087315](https://github.com/MovieMaker93/SparklingKit/commit/40873150bbfb86404095d614d95d1e7ec7889fac))
* **asr:** request word timestamps from Parakeet ([151abb8](https://github.com/MovieMaker93/SparklingKit/commit/151abb83660ceaa77a8914aa028d6358fa5db518))
* **asr:** write sentence lines and subtitle cues from word timestamps ([398f5f9](https://github.com/MovieMaker93/SparklingKit/commit/398f5f9da9daa5dd3eb1c40a8b1f2ff884cd84a8))
* **dgx:** drop the bundled LLM, Qwen3-ASR and grounding services ([febf891](https://github.com/MovieMaker93/SparklingKit/commit/febf891f63a403790d90e4c13020fccb244244bb))
* **dgx:** drop the bundled LocateAnything grounding service ([f508044](https://github.com/MovieMaker93/SparklingKit/commit/f508044d1f6368175774b9a82697550f01fbe3f4))
* **dgx:** drop the bundled Qwen3.6 LLM from the reference stack ([1827478](https://github.com/MovieMaker93/SparklingKit/commit/182747896cb9f91629cbcd4fb499c9d7391bce0d))
* **dgx:** drop the Qwen3-ASR backend; Parakeet is the only speech service ([3f170a7](https://github.com/MovieMaker93/SparklingKit/commit/3f170a776f561491d954b00d54fd66d30a3c0693))
* **dgx:** make Parakeet the default speech backend of the start script ([8464099](https://github.com/MovieMaker93/SparklingKit/commit/8464099bfb0cc6021e68888523944d083450d55a))
* **dgx:** run FastH3 video generation in the reference stack ([a9942d8](https://github.com/MovieMaker93/SparklingKit/commit/a9942d88247ef1fd13787f866c64737b697180b6))
* **ui:** hide grounding until a grounding endpoint is configured ([09b5e24](https://github.com/MovieMaker93/SparklingKit/commit/09b5e2436468b3e7bcf3cb632c0c4dd38205a21e))
* **ui:** hide grounding until a grounding endpoint is configured ([cc139fd](https://github.com/MovieMaker93/SparklingKit/commit/cc139fd8dcc0443e4a70438bc6c168cbc272b386))
* **ui:** offer video generation on the workbench instead of grounding ([9a6f81b](https://github.com/MovieMaker93/SparklingKit/commit/9a6f81bf0c83dad2c986994aed8390c7dee45cc5))
* **video:** add a FastH3 video service driven through ComfyUI ([e90388b](https://github.com/MovieMaker93/SparklingKit/commit/e90388b273a0b26358a6482db33ced0fbacc848c))
* **video:** add FastH3 text-to-video with sound ([fb7bf6d](https://github.com/MovieMaker93/SparklingKit/commit/fb7bf6d60de4115c616b872b46ebc0f3580aad46))
* **video:** add the text-to-video module ([69eb244](https://github.com/MovieMaker93/SparklingKit/commit/69eb24446ccd2c3b33c17f063615730df56c7a3a))
* **video:** offer 10-second videos ([5f52874](https://github.com/MovieMaker93/SparklingKit/commit/5f52874231e22a55c1662bf95f5ef9d5cd743654))
* **video:** offer 10-second videos ([f131112](https://github.com/MovieMaker93/SparklingKit/commit/f1311122b08d9780d96c15e12879f59fbab366e9))


### Bug fixes

* **asr:** drop Parakeet's &lt;unk&gt; marks from words ([40944f0](https://github.com/MovieMaker93/SparklingKit/commit/40944f0fd169d36d1b9df96feb70e496145c58c7))
* **asr:** keep chunk text when an ASR returns no word times ([526a1e1](https://github.com/MovieMaker93/SparklingKit/commit/526a1e19a6ae9e3bedc3619cfe31bd15cf9081b2))
* **asr:** keep subtitle cues within their caps when punctuation tokens follow ([727f3dd](https://github.com/MovieMaker93/SparklingKit/commit/727f3dd6f805b050185ac7beff421e06bdb7cd05))
* **asr:** run the Parakeet container without root and with a health check ([52d20d7](https://github.com/MovieMaker93/SparklingKit/commit/52d20d70022aa80c188832cfb7522bf99e4e7fe7))
* **asr:** send Parakeet chunks of at most 30 seconds ([78df572](https://github.com/MovieMaker93/SparklingKit/commit/78df57269d249fc088ade816f164321ae55442b4))
* **asr:** strip Qwen3-ASR language tags anywhere in a transcript ([91f0bc7](https://github.com/MovieMaker93/SparklingKit/commit/91f0bc71b050bb5471ec774ec813a58ed3c8db6e))
* **chat:** keep answers going when the page leaves the chat ([cf58ceb](https://github.com/MovieMaker93/SparklingKit/commit/cf58cebefbba8856fe876ad6a8339d193b951af8))
* **chat:** keep answers going when the page leaves the chat ([b5fd7cb](https://github.com/MovieMaker93/SparklingKit/commit/b5fd7cb9f6fc171c5c4e9366d6f52800a77fdbd9))
* **deps:** patch security advisories in production dependencies ([d1a6000](https://github.com/MovieMaker93/SparklingKit/commit/d1a60009da1f54494a94d0b971b9b1f27fce1705))
* **dgx:** default split installs and the demo to the Parakeet model id ([289cc05](https://github.com/MovieMaker93/SparklingKit/commit/289cc05650634945c2e6001c8e96be9b07809400))
* **dgx:** name the Parakeet engine from its command line ([f98de93](https://github.com/MovieMaker93/SparklingKit/commit/f98de93cb22ce7bbcf0c1aaf9370a93d40cd886f))
* **dgx:** report only the services the stack runs in status ([3d6cf12](https://github.com/MovieMaker93/SparklingKit/commit/3d6cf12296293da057b75994f3a1ecf7e051d88d))
* **dgx:** start Parakeet through its readiness variables ([787439c](https://github.com/MovieMaker93/SparklingKit/commit/787439c476ec02c6dcba884a837308f359852697))
* **dgx:** stop and remove containers of the retired services ([a65717e](https://github.com/MovieMaker93/SparklingKit/commit/a65717ed35a98532ad26c535aebec8d06311134c))
* **media:** forward only the status route through the demo proxy ([6e3bdbd](https://github.com/MovieMaker93/SparklingKit/commit/6e3bdbd0462cb6166534b65911eebf3b89eaa36b))
* patch dependency advisories, add CI/CD and make the fork public-ready ([01ca02b](https://github.com/MovieMaker93/SparklingKit/commit/01ca02b44bb952d92cee9530b0c5087076d064be))
* **ui:** point footer, update check and onboarding at the fork ([ed82934](https://github.com/MovieMaker93/SparklingKit/commit/ed829344841dab59ad78520ab7946ddd7516c3d1))
* **video:** create ComfyUI's base folders before starting it ([44d39d1](https://github.com/MovieMaker93/SparklingKit/commit/44d39d13ee571339db55ca61a8da06d4e6d558f5))


### Dependencies

* **dgx:** bump python-multipart to 0.0.31 in the adapters ([57f4e50](https://github.com/MovieMaker93/SparklingKit/commit/57f4e50b5796c7ad2cf49ef1eec17d0a906d613d))


### Documentation

* add per-container memory tables and Saluki's context size ([33caa5b](https://github.com/MovieMaker93/SparklingKit/commit/33caa5b9210fba772f3f99b2ad4c3706dc9a503e))
* **agents:** fix the memory rule after the stack lost its LLM ([9dfacb1](https://github.com/MovieMaker93/SparklingKit/commit/9dfacb13c051f94355e796cf0be5ebd85d0c7bf4))
* **asr:** design Parakeet as the default speech recognition backend ([e9e4c4b](https://github.com/MovieMaker93/SparklingKit/commit/e9e4c4b28b378b96d4641896e618979d3d93d1ff))
* **asr:** document Parakeet as the default speech backend ([7e7258e](https://github.com/MovieMaker93/SparklingKit/commit/7e7258e7a938e308350277ef1767add27579bb38))
* **asr:** plan the Parakeet backend and refine its timing rules ([cb685b1](https://github.com/MovieMaker93/SparklingKit/commit/cb685b14c3e71780bac125a08a7b8beb1607d8b7))
* describe the CI and release process and Conventional Commits ([60a4d5f](https://github.com/MovieMaker93/SparklingKit/commit/60a4d5f582f694e7a0b9f53bc416bc4f26a545f4))
* **dgx:** explain upgrading from the six-model stack ([7c02cce](https://github.com/MovieMaker93/SparklingKit/commit/7c02cceabfa8b48e4283a0e9b9b6885d2bb96078))
* **readme:** explain the video trade-offs and credit its authors ([4af9000](https://github.com/MovieMaker93/SparklingKit/commit/4af90005696ef8a5d75f2ac6cf470e03e7f85b03))
* **readme:** rewrite the README around a feature tour recorded from the real app ([8cfe93f](https://github.com/MovieMaker93/SparklingKit/commit/8cfe93f0c5a9bbddb59dd95d93dbe90022e30f40))
* **validation:** check parakeet.cpp v0.6.1 and load the Parakeet stack ([b018bc0](https://github.com/MovieMaker93/SparklingKit/commit/b018bc0e5e379f56ec5a41d3806e10e3a48e14ca))
* **validation:** correct the Parakeet chunk lengths and long-file figures ([f551a1c](https://github.com/MovieMaker93/SparklingKit/commit/f551a1c317205da296b1e63172dd6946bfacf5c4))
* **validation:** mark removed services in the memory tables ([a438c70](https://github.com/MovieMaker93/SparklingKit/commit/a438c70ac18d9f8038ceb44f79d20d9ffa43751b))
* **validation:** record Parakeet results through the app ([bc707d0](https://github.com/MovieMaker93/SparklingKit/commit/bc707d07372ece303819562263077b9345268f63))
* **validation:** record Parakeet with 30-second chunks against Qwen3-ASR ([f185631](https://github.com/MovieMaker93/SparklingKit/commit/f1856310112af42f0596e972d6f17851537c3ef5))
* **validation:** record the FastH3 video bake-off on the Spark ([5decaf3](https://github.com/MovieMaker93/SparklingKit/commit/5decaf3c7fffbc51cbf89a22d438d4176663df11))
* **validation:** record the FastH3 video bake-off on the Spark ([02d62dd](https://github.com/MovieMaker93/SparklingKit/commit/02d62dd6872217f712177824f35c091cbaaa9995))
* **validation:** record the FastH3 video service on the Spark ([842b07f](https://github.com/MovieMaker93/SparklingKit/commit/842b07f40335ac276043e76e8dcab65c3a0aafc1))
* **video:** document text-to-video, its service and its license ([c2e0300](https://github.com/MovieMaker93/SparklingKit/commit/c2e0300f42e5dd9021ea857cac7e6da0e311bff9))
