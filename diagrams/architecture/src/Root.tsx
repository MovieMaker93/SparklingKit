import { Composition } from "remotion";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { DURATION, FPS, HEIGHT, WIDTH } from "./script";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Architecture"
      component={ArchitectureDiagram}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
