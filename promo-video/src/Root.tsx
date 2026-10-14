import { Composition } from "remotion";
import { PromoVideo } from "./PromoVideo";
import "./index.css";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RentEasePromo"
      component={PromoVideo}
      durationInFrames={360}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
