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
