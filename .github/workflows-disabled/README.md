# Disabled GitHub Actions workflows

CI/CD is intentionally disabled for this project.

GitHub only executes workflow files under `.github/workflows/`, so the YAML files
in this directory are retained as configuration history and cannot run.

To re-enable a workflow, review its secrets and dependencies first, then move the
required YAML file back to `.github/workflows/`.
