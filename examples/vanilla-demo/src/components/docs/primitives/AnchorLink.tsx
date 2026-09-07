import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/sharp-solid-svg-icons';

/** The hover-revealed "#" next to every heading; copies a deep link on click. */
export function AnchorLink({ id, title }: { readonly id: string; readonly title: string }) {
  return (
    <a href={`#${id}`} className="docs-anchor" aria-label={`Link to ${title}`}>
      <FontAwesomeIcon icon={faLink} className="size-3" />
    </a>
  );
}
