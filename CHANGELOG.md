# Changelog

## [0.2.0](https://github.com/MovieMaker93/SparklingKit/compare/v0.1.5...v0.2.0) (2026-10-10)


### Features

* **asr:** add a Parakeet adapter with the OpenAI transcription route ([e580db2](https://github.com/MovieMaker93/SparklingKit/commit/e580db29ca98e2fee96aa3764f8f6fb3ba55fa16))
* **asr:** build sentences, subtitle cues and paragraphs from word timestamps ([ce40368](https://github.com/MovieMaker93/SparklingKit/commit/ce4036817bc88d00bf1f0d6e312952308b444786))
* **asr:** make Parakeet the default speech recognition backend ([93b2361](https://github.com/MovieMaker93/SparklingKit/commit/93b2361a06a8fb042b5c5cb4c341d017a7f47107))
* **asr:** package parakeet.cpp for the DGX Spark ([4087315](https://github.com/MovieMaker93/SparklingKit/commit/40873150bbfb86404095d614d95d1e7ec7889fac))
* **asr:** request word timestamps from Parakeet ([151abb8](https://github.com/MovieMaker93/SparklingKit/commit/151abb83660ceaa77a8914aa028d6358fa5db518))
* **asr:** write sentence lines and subtitle cues from word timestamps ([398f5f9](https://github.com/MovieMaker93/SparklingKit/commit/398f5f9da9daa5dd3eb1c40a8b1f2ff884cd84a8))
* **dgx:** make Parakeet the default speech backend of the start script ([8464099](https://github.com/MovieMaker93/SparklingKit/commit/8464099bfb0cc6021e68888523944d083450d55a))


### Bug fixes

* **asr:** drop Parakeet's &lt;unk&gt; marks from words ([40944f0](https://github.com/MovieMaker93/SparklingKit/commit/40944f0fd169d36d1b9df96feb70e496145c58c7))
* **asr:** keep chunk text when an ASR returns no word times ([526a1e1](https://github.com/MovieMaker93/SparklingKit/commit/526a1e19a6ae9e3bedc3619cfe31bd15cf9081b2))
* **asr:** keep subtitle cues within their caps when punctuation tokens follow ([727f3dd](https://github.com/MovieMaker93/SparklingKit/commit/727f3dd6f805b050185ac7beff421e06bdb7cd05))
* **asr:** run the Parakeet container without root and with a health check ([52d20d7](https://github.com/MovieMaker93/SparklingKit/commit/52d20d70022aa80c188832cfb7522bf99e4e7fe7))
* **asr:** send Parakeet chunks of at most 30 seconds ([78df572](https://github.com/MovieMaker93/SparklingKit/commit/78df57269d249fc088ade816f164321ae55442b4))
* **asr:** strip Qwen3-ASR language tags anywhere in a transcript ([91f0bc7](https://github.com/MovieMaker93/SparklingKit/commit/91f0bc71b050bb5471ec774ec813a58ed3c8db6e))
* **deps:** patch security advisories in production dependencies ([d1a6000](https://github.com/MovieMaker93/SparklingKit/commit/d1a60009da1f54494a94d0b971b9b1f27fce1705))
* **dgx:** default split installs and the demo to the Parakeet model id ([289cc05](https://github.com/MovieMaker93/SparklingKit/commit/289cc05650634945c2e6001c8e96be9b07809400))
* **dgx:** name the Parakeet engine from its command line ([f98de93](https://github.com/MovieMaker93/SparklingKit/commit/f98de93cb22ce7bbcf0c1aaf9370a93d40cd886f))
* **media:** forward only the status route through the demo proxy ([6e3bdbd](https://github.com/MovieMaker93/SparklingKit/commit/6e3bdbd0462cb6166534b65911eebf3b89eaa36b))
* patch dependency advisories, add CI/CD and make the fork public-ready ([01ca02b](https://github.com/MovieMaker93/SparklingKit/commit/01ca02b44bb952d92cee9530b0c5087076d064be))


### Dependencies

* **dgx:** bump python-multipart to 0.0.31 in the adapters ([57f4e50](https://github.com/MovieMaker93/SparklingKit/commit/57f4e50b5796c7ad2cf49ef1eec17d0a906d613d))


### Documentation

* add per-container memory tables and Saluki's context size ([33caa5b](https://github.com/MovieMaker93/SparklingKit/commit/33caa5b9210fba772f3f99b2ad4c3706dc9a503e))
* **asr:** design Parakeet as the default speech recognition backend ([e9e4c4b](https://github.com/MovieMaker93/SparklingKit/commit/e9e4c4b28b378b96d4641896e618979d3d93d1ff))
* **asr:** document Parakeet as the default speech backend ([7e7258e](https://github.com/MovieMaker93/SparklingKit/commit/7e7258e7a938e308350277ef1767add27579bb38))
* **asr:** plan the Parakeet backend and refine its timing rules ([cb685b1](https://github.com/MovieMaker93/SparklingKit/commit/cb685b14c3e71780bac125a08a7b8beb1607d8b7))
* describe the CI and release process and Conventional Commits ([60a4d5f](https://github.com/MovieMaker93/SparklingKit/commit/60a4d5f582f694e7a0b9f53bc416bc4f26a545f4))
* **readme:** rewrite the README around a feature tour recorded from the real app ([8cfe93f](https://github.com/MovieMaker93/SparklingKit/commit/8cfe93f0c5a9bbddb59dd95d93dbe90022e30f40))
* **validation:** check parakeet.cpp v0.6.1 and load the Parakeet stack ([b018bc0](https://github.com/MovieMaker93/SparklingKit/commit/b018bc0e5e379f56ec5a41d3806e10e3a48e14ca))
* **validation:** correct the Parakeet chunk lengths and long-file figures ([f551a1c](https://github.com/MovieMaker93/SparklingKit/commit/f551a1c317205da296b1e63172dd6946bfacf5c4))
* **validation:** record Parakeet results through the app ([bc707d0](https://github.com/MovieMaker93/SparklingKit/commit/bc707d07372ece303819562263077b9345268f63))
* **validation:** record Parakeet with 30-second chunks against Qwen3-ASR ([f185631](https://github.com/MovieMaker93/SparklingKit/commit/f1856310112af42f0596e972d6f17851537c3ef5))
