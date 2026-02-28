# Infrastructure Validation

## Terraform

Use the narrowest affected directory:

```bash
terraform fmt -check
terraform validate
```

## Docker

From the repository root:

```bash
docker compose config
```

## Working notes

- Run only the checks that match the files you changed.
- Document skipped validation when the local toolchain is missing.
