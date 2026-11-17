# Agent notes

- Never commit real environment values (service URLs, tokens, product IDs, layer names, extents, levels) in `examples/config/*.js`. Commit placeholders only, as described in the README under "Example config values"; `npm test` enforces it.
- To run an example against real data locally, change the copy you upload to your own test bucket, never the committed files.
