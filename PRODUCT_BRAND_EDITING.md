# Product brand editing

This document records the compatibility rules for assigning brands to products in the admin product form.

## Admin form behavior

- Editing a product starts with the brand stored on the product. It must never default to “no brand” merely because the field was not present in the client type.
- An unchanged brand is omitted from edit requests. This prevents an old, already-open form from restoring a brand name that another admin renamed in the meantime.
- Choosing “no brand” is an explicit action. The client sends an empty string and the server removes the stored field.
- Active brands are selectable. A currently assigned inactive or legacy/orphaned brand remains visible with a warning label, but cannot be assigned again after the admin chooses another value.
- If the admin brand list cannot be loaded, the current value remains visible and the brand control is locked. Other product fields can still be saved because the unchanged brand is omitted.
- Opening the admin editor force-refreshes product details so its initial brand does not come from the long-lived storefront details cache.

## Server write contract

For both the simple-product and product-with-SKUs update paths:

- omitted `brand`: leave the stored value unchanged;
- `brand: ""`, whitespace, or `null`: remove the field with `$unset`;
- non-empty `brand`: preserve the submitted value for backward compatibility.

Product creation drops empty brand values rather than storing an empty string.

## Brand rename, usage, and filtering

- A brand update may include `expectedUpdatedAt`. A stale revision returns HTTP 409 instead of overwriting a concurrent admin change.
- A rename and the update of every matching product reference run in one MongoDB transaction. Matching is exact and case-insensitive, includes inactive/soft-deleted products, and supports case-only renames.
- Usage checks and deletion use the same case-insensitive collation. Deletion rechecks usage inside its transaction.
- Public product brand filters use escaped, exact, case-insensitive regular expressions so legacy casing and names containing regex characters continue to work.
- After a successful brand update, client product-detail and filtered-product caches are cleared. Request versioning prevents an older in-flight details request from repopulating the cache afterward.
- Brand update payloads reject non-boolean status values and invalid optimistic-revision timestamps with HTTP 400.

## Deliberate compatibility boundary

Products still reference a brand by its name string rather than by a `brandId`. Existing product API paths therefore continue accepting a non-empty legacy string, including one that is not currently in the Brand collection. Tightening every legacy write path or migrating to `brandId` would be a separate data migration with a wider compatibility risk.

The admin UI prevents new orphaned assignments through its controlled list. A future `brandId` migration is the complete solution for database-level referential integrity, including the rare race between a direct product write and brand deletion.

## Regression coverage

Tests cover initial form state, dirty-field submission, explicit removal through both product update endpoints, inactive/orphan display, case-insensitive filtering with regex characters, creation normalization, transactional rename, duplicate/stale updates, status-only updates, and usage-protected deletion.
