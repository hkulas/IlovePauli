export function keepIfTopicExists(
  selected: string | "all",
  topicIds: Iterable<string>,
): string | "all" {
  if (selected === "all") return "all";
  for (const id of topicIds) {
    if (id === selected) return selected;
  }
  return "all";
}
