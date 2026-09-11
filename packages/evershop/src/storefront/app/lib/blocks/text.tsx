import { Fragment } from 'react';

/**
 * Renders a plain string with newlines as line breaks.
 *
 * Blocks want a controlled break in a headline ("A legacy of leadership <br/>
 * and strategic impact"). A `ReactNode` prop would express that, but a page
 * builder stores JSON and can only hand back a string — so headlines take a
 * string, the merchant presses Enter, and this produces the same markup.
 *
 * Mirrors `@/lib/block-text` in the block library, so a block's JSX is
 * unchanged by the port.
 */
export function Multiline({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <>
      {children.split('\n').map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}
