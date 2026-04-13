/**
 * @file Toolbar container component.
 */

export type ToolbarProps = {
  readonly children: React.ReactNode;
};






/** Toolbar container component for viewer controls. */
export function Toolbar({ children }: ToolbarProps): React.JSX.Element {
  return <div className="toolbar">{children}</div>;
}






/** Flexible spacer element for the toolbar layout. */
export function ToolbarSpacer(): React.JSX.Element {
  return <div className="spacer" />;
}






/** Inline info text display within the toolbar. */
export function ToolbarInfo({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <span className="info">{children}</span>;
}
