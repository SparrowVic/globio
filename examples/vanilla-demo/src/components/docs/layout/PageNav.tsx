import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/sharp-solid-svg-icons';
import { findPage, pageHref } from '@/docs/manifest';

/** Previous / next within the current tab, in reading order. */
export function PageNav({ slug }: { readonly slug: string }) {
  const loc = findPage(slug);
  if (!loc || (!loc.prev && !loc.next)) return null;
  return (
    <nav className="docs-pagenav" aria-label="Previous and next page">
      {loc.prev ? (
        <Link to={pageHref(loc.prev.slug)} className="docs-pagenav-link" rel="prev">
          <span className="docs-pagenav-label">
            <FontAwesomeIcon icon={faArrowLeft} className="size-2.5" />
            Previous
          </span>
          <span className="docs-pagenav-title">{loc.prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {loc.next && (
        <Link to={pageHref(loc.next.slug)} className="docs-pagenav-link is-next" rel="next">
          <span className="docs-pagenav-label">
            Next
            <FontAwesomeIcon icon={faArrowRight} className="size-2.5" />
          </span>
          <span className="docs-pagenav-title">{loc.next.title}</span>
        </Link>
      )}
    </nav>
  );
}
