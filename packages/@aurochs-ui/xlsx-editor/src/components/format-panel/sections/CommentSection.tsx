/**
 * @file Comment section (format panel)
 *
 * UI for viewing and editing cell comments.
 */

import { useState, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, Input, Button, FieldGroup } from "@aurochs-ui/ui-components";
import { colorTokens, fontTokens, spacingTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { XlsxComment } from "@aurochs-office/xlsx/domain/comment";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";

export type CommentSectionProps = {
  readonly disabled: boolean;
  readonly address: CellAddress;
  readonly comment: XlsxComment | undefined;
  readonly onCommentChange: (comment: XlsxComment) => void;
  readonly onCommentDelete: () => void;
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "60px",
  padding: spacingTokens.sm,
  fontSize: fontTokens.size.md,
  fontFamily: "inherit",
  border: `1px solid ${colorTokens.border.subtle}`,
  borderRadius: "4px",
  backgroundColor: colorTokens.background.tertiary,
  color: colorTokens.text.primary,
  resize: "vertical",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: spacingTokens.sm,
  marginTop: spacingTokens.sm,
};

const noCommentStyle: CSSProperties = {
  fontSize: fontTokens.size.sm,
  color: colorTokens.text.tertiary,
  fontStyle: "italic",
  marginBottom: spacingTokens.sm,
};

/**
 * Comment editing section in the format panel.
 */
export function CommentSection({
  disabled,
  address,
  comment,
  onCommentChange,
  onCommentDelete,
}: CommentSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(comment?.text ?? "");
  const [draftAuthor, setDraftAuthor] = useState(comment?.author ?? "");

  const hasComment = comment !== undefined;

  const handleStartEdit = useCallback(() => {
    setDraftText(comment?.text ?? "");
    setDraftAuthor(comment?.author ?? "");
    setIsEditing(true);
  }, [comment]);

  const handleSave = useCallback(() => {
    if (draftText.trim().length === 0) {
      // Empty text = delete comment
      onCommentDelete();
    } else {
      onCommentChange({
        address,
        text: draftText.trim(),
        author: draftAuthor.trim() || undefined,
      });
    }
    setIsEditing(false);
  }, [address, draftText, draftAuthor, onCommentChange, onCommentDelete]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraftText(comment?.text ?? "");
    setDraftAuthor(comment?.author ?? "");
  }, [comment]);

  const handleDelete = useCallback(() => {
    onCommentDelete();
    setIsEditing(false);
    setDraftText("");
    setDraftAuthor("");
  }, [onCommentDelete]);

  return (
    <Accordion title="Comment" defaultExpanded={hasComment}>
      {isEditing ? (
        <>
          <FieldGroup label="Author">
            <Input
              type="text"
              value={draftAuthor}
              placeholder="Author name"
              disabled={disabled}
              onChange={(v) => setDraftAuthor(String(v))}
            />
          </FieldGroup>
          <FieldGroup label="Comment">
            <textarea
              style={textareaStyle}
              value={draftText}
              placeholder="Enter comment..."
              disabled={disabled}
              onChange={(e) => setDraftText(e.target.value)}
            />
          </FieldGroup>
          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleCancel}>
              Cancel
            </Button>
            {hasComment && (
              <Button size="sm" disabled={disabled} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
        </>
      ) : hasComment ? (
        <>
          {comment.author && (
            <div style={{ fontSize: fontTokens.size.sm, color: colorTokens.text.secondary, marginBottom: spacingTokens.xs }}>
              By: {comment.author}
            </div>
          )}
          <div style={{ fontSize: fontTokens.size.md, marginBottom: spacingTokens.sm, whiteSpace: "pre-wrap" }}>
            {comment.text}
          </div>
          <div style={buttonRowStyle}>
            <Button size="sm" disabled={disabled} onClick={handleStartEdit}>
              Edit
            </Button>
            <Button size="sm" disabled={disabled} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={noCommentStyle}>No comment on this cell</div>
          <Button size="sm" disabled={disabled} onClick={handleStartEdit}>
            Add Comment
          </Button>
        </>
      )}
    </Accordion>
  );
}
