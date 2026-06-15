#!/bin/bash
# One-time setup script for the Where project.
# Run after cloning: ./setup.sh

set -e

echo "Configuring git to use shared hooks from .githooks/"
git config core.hooksPath .githooks
chmod +x .githooks/*

echo "Done. Pre-commit and commit-msg hooks are now active."
echo ""
echo "Next steps:"
echo "  1. cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "  2. cd frontend && bun install"
