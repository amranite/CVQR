# CVQR Public Documentation

This folder is the public documentation package for CVQR. It is written for teachers, demo users, and future developers who need to understand what the project does, how it is built, and how to continue it safely.

The repository landing page is the root [`README.md`](../README.md). This file is the documentation index that GitHub displays when someone opens the `docs/` folder.

## Recommended Reading Order

| Reader | Start here |
| --- | --- |
| Teacher or evaluator | [Project Overview](project-overview.md), then [User Guide](user-guide.md) and [Design Notes](design.md). |
| Demo presenter | [Setup And Development](setup-and-development.md), then [User Guide](user-guide.md). |
| Future developer | [Tech Stack](tech-stack.md), [Architecture](architecture.md), [Data Model](data-model.md), and [API Reference](api-reference.md). |
| Security reviewer | [Security And Limitations](security-and-limitations.md). |
| Maintainer | [Future Development](future-development.md). |

## Files

| File | Purpose |
| --- | --- |
| [project-overview.md](project-overview.md) | Product goal, target users, MVP scope, and current feature set. |
| [setup-and-development.md](setup-and-development.md) | Local setup, environment variables, database reset, demo seed, and verification commands. |
| [tech-stack.md](tech-stack.md) | Runtime, libraries, frontend approach, persistence, and development scripts. |
| [architecture.md](architecture.md) | System structure, request flow, role boundaries, QR flow, and important source files. |
| [data-model.md](data-model.md) | Database tables, relationships, and runtime rules. |
| [api-reference.md](api-reference.md) | Implemented API route groups and access requirements. |
| [user-guide.md](user-guide.md) | How students, companies, and admins use the application. |
| [design.md](design.md) | UX goals, layout system, navigation, feedback, and responsive behavior. |
| [security-and-limitations.md](security-and-limitations.md) | Current security baseline, known gaps, and production hardening work. |
| [future-development.md](future-development.md) | Practical guidance for extending the project. |

## Diagram Format

Several files use Mermaid code blocks for diagrams. Markdown viewers that support Mermaid, such as GitHub and many documentation tools, render these as flowcharts, sequence diagrams, state diagrams, or ERDs. Viewers without Mermaid support still show the source text.

## Documentation Scope

The files listed above are intended to be self-contained for public repository use. They avoid links to non-public notes and include the project, setup, architecture, data model, API, user, design, security, and future-development information needed to understand the app.
