MiniOS network connectivity probe v1

Purpose: test sustained HTTPS transfer for MiniOS network fallback.
Size: 1048576 bytes (1 MiB), downloaded in one request.
Content: deterministic, poorly compressible synthetic bytes; no user data.
Generation: hashlib.shake_256(b'MiniOS network connectivity probe v1\n').digest(1048576)
SHA-256: 8098e63d94f6c48aaf609624bf3c8d4c720d5e18504ea6cb34e86eb4c493f32b

Keep this version immutable. Do not replace it with zeros, text, a redirect,
or a compressed representation. Publish changed content under a new version.
The dispatcher checks a locally pinned size and SHA-256, not a downloaded hash.
A successful 1 MiB transfer does not guarantee an entire ISO will download.
