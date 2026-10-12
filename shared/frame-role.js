/**
 * D2L Dark Mode — Frame Role
 *
 * Decides what a document is relative to Brightspace, from facts that
 * gate.js collects. Pure: no DOM, no chrome.*, so the answer depends only
 * on the facts passed in.
 *
 * Roles:
 *  - root:     Brightspace frame that applies the page inversion
 *  - nested:   Brightspace frame inside an inverted ancestor
 *  - embedded: foreign content (a video player, ...) inside an inverted page
 *  - none:     not ours to touch
 *  - pending:  a fact is still missing; `wait` names it, and the caller
 *              resolves again once it has that fact
 *
 * Facts (undefined = not known yet):
 *  top, about, excludedHost, markers, knownHost
 *  parent: null (top frame) | { crossOrigin: true }
 *        | { role, active, top, markers, frameset, d2lPath, knownHost }
 *  knownAncestor  'origins'  an ancestor origin was detected as Brightspace before
 *  domDetected    'dom'      Brightspace elements present once the DOM is parsed
 *  customDomain   'custom'   hostname is in the user's custom domains
 *  parentInverted 'parent'   the parent's handshake reply
 */

(function () {
  'use strict';

  function pending(wait) {
    return { role: 'pending', wait: wait };
  }

  /** Embedded content only takes the role once its parent renders inverted. */
  function viaParent(f) {
    return f.parentInverted === true ? { role: 'embedded' } : pending('parent');
  }

  function isEmbeddedParent(p) {
    return !!p && !p.crossOrigin && (p.role === 'embedded' || p.role === 'linking');
  }

  /** A Brightspace frame applies the filter itself unless an ancestor already does. */
  function appliesFilter(f) {
    var p = f.parent;
    if (f.top || !p || p.crossOrigin) return true;
    // A frameset can't carry a filter, so its frames invert themselves
    if (p.frameset) return true;
    if (p.top || p.active || p.d2lPath || p.markers || p.knownHost) return false;
    return true;
  }

  function resolve(f) {
    var p = f.parent;

    // about:blank / srcdoc frames share their parent's origin and follow it
    if (f.about) {
      if (isEmbeddedParent(p)) return viaParent(f);
      return p && !p.crossOrigin && p.active ? { role: 'nested' } : { role: 'none' };
    }

    // Children of embedded frames are embedded too, never Brightspace pages
    if (!f.top && isEmbeddedParent(p)) return viaParent(f);

    if (f.excludedHost) return { role: 'none' };

    var brightspace = !!(f.markers || f.knownHost);
    // Same-origin children may lack the markers; the parent vouches for them
    if (!brightspace && !f.top && p && !p.crossOrigin && (p.active || p.markers)) brightspace = true;

    if (!brightspace && !f.top && p && p.crossOrigin) {
      if (f.knownAncestor === undefined) return pending('origins');
      return f.knownAncestor ? viaParent(f) : { role: 'none' };
    }

    if (!brightspace) {
      if (f.domDetected === undefined) return pending('dom');
      if (!f.domDetected) {
        if (f.customDomain === undefined) return pending('custom');
        if (!f.customDomain) return { role: 'none' };
      }
    }

    return { role: appliesFilter(f) ? 'root' : 'nested' };
  }

  self.D2LFrameRole = { resolve: resolve };
})();
