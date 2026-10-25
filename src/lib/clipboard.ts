// Copies text that is still being fetched. Safari (and Chrome once the page loses focus) refuses
// `writeText` after an `await`: the click that allowed it is over. A ClipboardItem built from a
// promise, handed over during the click, keeps that permission while the text arrives. Without
// ClipboardItem, the text is awaited then written the old way.
export async function copyLater(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const blob = text.then((t) => new Blob([t], { type: "text/plain" }));
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return;
    } catch (e) {
      // A failed fetch throws here: nothing to copy.
      const t = await text;
      if (copyByHand(t)) return;
      throw e;
    }
  }
  const t = await text;
  try {
    await navigator.clipboard.writeText(t);
  } catch (e) {
    if (!copyByHand(t)) throw e;
  }
}

// Last resort: a hidden text field and the browser's copy command.
function copyByHand(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
