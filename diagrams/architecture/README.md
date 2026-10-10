# Architecture diagram

A 30-second Remotion diagram of how one file moves through SparklingKit. Each sentence on the left lights the nodes it is talking about, and a token walks the same path the app uses: browser, API, job folder, Redis, worker, the OCR endpoint, then back as an artifact with lineage.

It is a documentation render. The app does not load it, and Compose does not start it.

```bash
cd diagrams/architecture
npm install
npm test
npm run dev      # studio, to scrub the timeline
npm run render   # out/architecture.mp4
npm run still    # out/poster.png, the closing frame
```

The first render downloads a headless Chrome. The story and the coordinates live in `src/script.ts` and `src/geometry.ts`; `npm test` checks that the sentences cover the timeline and that the arrows stay off the cards.
