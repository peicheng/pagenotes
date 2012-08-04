#!/bin/bash

# This is to make sure that we don't archive unnecessary files.
cat > .git/info/attributes << EOF
*.sh export-ignore
*.svg export-ignore
EOF

git archive --output=../chrome-page-notes.zip HEAD
