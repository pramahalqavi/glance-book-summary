export interface CaretPoint {
  node: Node;
  offset: number;
}

export function hasNonEmptySelection(): boolean {
  const sel = window.getSelection();
  return Boolean(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
}

/**
 * Resolves a text caret at `(clientX, clientY)` inside `container`.
 * When `requireDirectHit` is true (used on initial touchstart), ensures the touch
 * actually landed near rendered text rather than empty whitespace or an off-screen column.
 */
export function getCaretFromPoint(
  clientX: number,
  clientY: number,
  container?: HTMLElement | null,
  requireDirectHit = false
): CaretPoint | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };

  let node: Node | null = null;
  let offset = 0;
  let caretRect: DOMRect | null = null;

  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (range?.startContainer) {
      node = range.startContainer;
      offset = range.startOffset;
      caretRect = range.getBoundingClientRect();
    }
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos?.offsetNode) {
      node = pos.offsetNode;
      offset = pos.offset;
      try {
        const r = document.createRange();
        r.setStart(node, offset);
        r.collapse(true);
        caretRect = r.getBoundingClientRect();
      } catch {
        caretRect = null;
      }
    }
  }

  if (!node) return null;
  if (container && !container.contains(node)) return null;

  if (caretRect && (caretRect.width > 0 || caretRect.height > 0)) {
    // Reject carets resolved to an off-screen column
    if (caretRect.right < -4 || caretRect.left > window.innerWidth + 4) {
      return null;
    }
    if (requireDirectHit) {
      const verticalSlop = 28;
      if (
        clientY < caretRect.top - verticalSlop ||
        clientY > caretRect.bottom + verticalSlop
      ) {
        return null;
      }
    }
  }

  return { node, offset };
}

export function getWordBounds(node: Node, offset: number): { start: number; end: number } {
  if (node.nodeType !== Node.TEXT_NODE || !node.textContent) {
    return { start: offset, end: offset };
  }
  const text = node.textContent;
  let start = Math.max(0, Math.min(offset, text.length));
  let end = start;
  while (start > 0 && /\S/.test(text[start - 1])) start--;
  while (end < text.length && /\S/.test(text[end])) end++;
  return { start, end };
}

/**
 * Selects the full word at `anchor` when long-press activates so the user
 * gets immediate visual feedback before dragging across additional words.
 */
export function selectWordAtCaret(anchor: CaretPoint): boolean {
  if (anchor.node.nodeType !== Node.TEXT_NODE) return false;
  const sel = window.getSelection();
  if (!sel) return false;
  const bounds = getWordBounds(anchor.node, anchor.offset);
  if (bounds.end <= bounds.start) return false;
  try {
    sel.setBaseAndExtent(anchor.node, bounds.start, anchor.node, bounds.end);
    return true;
  } catch {
    return false;
  }
}

/**
 * Expands text selection from `anchor` to `(clientX, clientY)` inside `container`,
 * snapping the anchor end to the full starting word boundary.
 */
export function applyTouchDragSelection(
  anchor: CaretPoint,
  clientX: number,
  clientY: number,
  container: HTMLElement | null
): boolean {
  const focus = getCaretFromPoint(clientX, clientY, container, false);
  if (!focus) return false;
  const sel = window.getSelection();
  if (!sel) return false;

  const anchorBounds = getWordBounds(anchor.node, anchor.offset);
  let anchorOffset = anchorBounds.start;
  let focusOffset = focus.offset;

  try {
    const cmp = document.createRange();
    cmp.setStart(anchor.node, anchor.offset);
    cmp.collapse(true);
    const focusCmp = cmp.comparePoint(focus.node, focus.offset);
    if (focusCmp < 0) {
      anchorOffset = anchorBounds.end;
    } else if (focus.node === anchor.node && focusOffset <= anchorBounds.end) {
      focusOffset = anchorBounds.end;
    }
  } catch {
    anchorOffset = anchor.offset;
  }

  try {
    sel.setBaseAndExtent(anchor.node, anchorOffset, focus.node, focusOffset);
    return true;
  } catch {
    return false;
  }
}
