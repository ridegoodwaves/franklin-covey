"use client";

import { WistiaPlayer } from "@wistia/wistia-player-react";

interface WistiaCoachPlayerProps {
  readonly mediaId: string;
  readonly coachName: string;
  readonly onPlay?: (mediaId: string) => void;
}

export function WistiaCoachPlayer({
  mediaId,
  coachName,
  onPlay,
}: WistiaCoachPlayerProps) {
  return (
    <div aria-label={`Introduction video for ${coachName}`}>
      <WistiaPlayer
        mediaId={mediaId}
        playerColor="#1A4C6E"
        aspect={16 / 9}
        preload="none"
        settingsControl={false}
        playbackRateControl={false}
        qualityControl={false}
        bigPlayButton={false}
        roundedPlayer={8}
        doNotTrack={true}
        seo={false}
        endVideoBehavior="reset"
        onPlay={() => onPlay?.(mediaId)}
      />
    </div>
  );
}
