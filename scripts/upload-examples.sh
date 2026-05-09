#!/usr/bin/env bash
set -euo pipefail

# Upload all files under examples/ to S3.
# - New files are uploaded.
# - Existing files are uploaded only if their content differs (MD5 vs S3 ETag).
# - Identical files are skipped.
# Reads AWS_* env vars (same as the app).
#
# Usage:
#   ./scripts/upload-examples.sh [examples-dir]
#
# The optional argument overrides the default examples/ directory.

declare -A CMD_INSTALL=(
  [aws]="AWS CLI v2 — https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
         Linux: curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o awscliv2.zip && unzip awscliv2.zip && sudo ./aws/install
         macOS: brew install awscli
         NOTE: avoid 'sudo apt install awscli' — the apt package (v1) conflicts with newer botocore"
)

for cmd in "${!CMD_INSTALL[@]}"; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "WARNING: '$cmd' is not installed or not in PATH." >&2
    echo "         Install: ${CMD_INSTALL[$cmd]}" >&2
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

EXAMPLES_DIR="${1:-$REPO_ROOT/examples}"
BUCKET="${AWS_BUCKET:?AWS_BUCKET is required}"
ENDPOINT="${AWS_ENDPOINT_URL:-}"
REGION="${AWS_REGION:-us-east-1}"
PARALLELISM="${UPLOAD_PARALLELISM:-8}"

if [[ ! -d "$EXAMPLES_DIR" ]]; then
  echo "ERROR: examples directory not found: $EXAMPLES_DIR" >&2
  exit 1
fi

ENDPOINT_FLAG=""
if [[ -n "$ENDPOINT" ]]; then
  ENDPOINT_FLAG="--endpoint-url $ENDPOINT"
fi

# Fetch all existing S3 keys + ETags in one list-objects call.
# Output format per line: <key>\t<etag>  (ETag has surrounding quotes stripped)
echo "Fetching existing S3 objects..."
s3_index=$(mktemp)
trap 'rm -f "$s3_index"' EXIT

aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --region "$REGION" \
  $ENDPOINT_FLAG \
  --query 'Contents[].[Key, ETag]' \
  --output text 2>/dev/null \
  | sed 's/"//g' \
  | sort -k1,1 > "$s3_index" || true

existing_count=$(wc -l < "$s3_index")
echo "Found $existing_count existing objects in S3."
echo ""

# Temp dir for inter-process counters and upload list
tmp_dir=$(mktemp -d)
trap 'rm -f "$s3_index"; rm -rf "$tmp_dir"' EXIT
touch "$tmp_dir/uploaded" "$tmp_dir/updated" "$tmp_dir/skipped" "$tmp_dir/failed"
to_upload="$tmp_dir/to_upload"

# Classify each local file in the main process.
# Subshells (xargs workers) only handle the actual aws s3 cp calls.
while IFS= read -r -d '' file; do
  key="${file#$EXAMPLES_DIR/}"
  local_md5=$(md5sum "$file" | cut -d' ' -f1)

  s3_entry=$(grep -P "^${key}\t" "$s3_index" || true)

  if [[ -z "$s3_entry" ]]; then
    # New file
    printf '%s\0' "new|$file" >> "$to_upload"
  else
    s3_etag=$(printf '%s' "$s3_entry" | awk '{print $2}')
    if [[ "$local_md5" == "$s3_etag" ]]; then
      echo "SKIP    $key"
      echo 1 >> "$tmp_dir/skipped"
    else
      # Changed file — overwrite
      printf '%s\0' "update|$file" >> "$to_upload"
    fi
  fi
done < <(find "$EXAMPLES_DIR" -type f -print0 | sort -z)

upload_file() {
  local mode file key label
  mode="${1%%|*}"
  file="${1#*|}"
  key="${file#$EXAMPLES_DIR/}"
  label=$([ "$mode" = "update" ] && echo "UPDATE" || echo "UP")

  if aws s3 cp \
      "$file" \
      "s3://$BUCKET/$key" \
      --region "$REGION" \
      $ENDPOINT_FLAG \
      > /dev/null 2>&1; then
    echo "$label    $key"
    echo 1 >> "$tmp_dir/$mode"d
  else
    echo "FAIL    $key" >&2
    echo 1 >> "$tmp_dir/failed"
  fi
}
export -f upload_file
export EXAMPLES_DIR BUCKET REGION ENDPOINT_FLAG tmp_dir

if [[ -s "$to_upload" ]]; then
  xargs -0 -P "$PARALLELISM" -I{} bash -c 'upload_file "$@"' _ {} < "$to_upload"
fi

uploaded=$(wc -l < "$tmp_dir/uploaded")
updated=$(wc -l < "$tmp_dir/updated")
skipped=$(wc -l < "$tmp_dir/skipped")
failed=$(wc -l < "$tmp_dir/failed")

echo ""
echo "Done — uploaded: $uploaded new, $updated updated, $skipped skipped, $failed failed"

if ((failed > 0)); then
  exit 1
fi
