export function chooseTrackedPose(poses, trackId) {
  if (trackId !== null) {
    return {
      pose: poses.find((pose) => pose.id === trackId) || null,
      trackId,
    };
  }

  const pose = poses
    .filter((candidate) => Number.isFinite(candidate.id))
    .sort((left, right) => (right.score || 0) - (left.score || 0))[0] || null;

  return { pose, trackId: pose?.id ?? null };
}

export function updateSustainedWarnings(poses, warningSinceByTrack, now, isBadPosture, delayMs) {
  const visibleTrackIds = new Set();
  const warningTrackIds = [];

  for (const pose of poses) {
    if (!Number.isFinite(pose.id)) continue;
    visibleTrackIds.add(pose.id);

    if (!isBadPosture(pose)) {
      warningSinceByTrack.delete(pose.id);
      continue;
    }

    if (!warningSinceByTrack.has(pose.id)) warningSinceByTrack.set(pose.id, now);
    if (now - warningSinceByTrack.get(pose.id) >= delayMs) warningTrackIds.push(pose.id);
  }

  for (const trackId of warningSinceByTrack.keys()) {
    if (!visibleTrackIds.has(trackId)) warningSinceByTrack.delete(trackId);
  }

  return warningTrackIds.sort((left, right) => left - right);
}
