Candidate-session video players keep the native browser controls untouched; seek usability comes from the invisible grab strip over the native progress bar (`VideoSeekGrab`), never from a second visible slider and never from forced seeks in the file.

- The external export API (`export-api` function) is read-only and authenticated by the `EXPORT_API_KEY` header secret; it never returns candidate session tokens. Why: lets an external tool pull production data without user accounts.
