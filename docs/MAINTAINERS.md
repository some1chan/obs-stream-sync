# Note to Maintainers

This document serves as a guide for how the project works.

If you're looking to set up a development environment, check out [development-environment.md](./development-environment.md)! It's recommended you skim this even if you're an experienced developer.

## Structural Notes

When reviewing the code, start off at [index.ts](https://github.com/some1chan/obs-stream-sync/blob/main/src/index.ts), and start tracing everything from `runProgram()`. From there, you'll see the command handler.

## README.md

[Link to Mermaid Layout](https://mermaid.live/edit#pako:eNplkEFrwzAMhf-K0GmD5g_kMEiaHkcPGdsh7kGN5cXUsYutMErb_z4nS6EwncQn8d7jXbEPmrHE70jnAT4a5SFP1bUSmUaoDlAUbyutH7R-ptsH3T7TptvXLbQyaRsOK8rXm8IvPrahP7HAiw4_3gXSSSmf-sjs0xAEgoG0SKZXhbddF46pSBffFytd9Xb_9FhbmbXa_Ax7YxJLAuuhmlNkTl7Dp9UcoGFHFzDWCcfFJcfGDY4cR7I693GdPRTKwCMrLPOq2dDkRKHy9_xKk4TZB0uJE29wOmsSbizlJkcsDbmU6ZwoxPe_jpeq77_3VXp1)

[![](https://mermaid.ink/img/pako:eNplkEFrwzAMhf-K0GmD5g_kMEiaHkcPGdsh7kGN5cXUsYutMErb_z4nS6EwncQn8d7jXbEPmrHE70jnAT4a5SFP1bUSmUaoDlAUbyutH7R-ptsH3T7TptvXLbQyaRsOK8rXm8IvPrahP7HAiw4_3gXSSSmf-sjs0xAEgoG0SKZXhbddF46pSBffFytd9Xb_9FhbmbXa_Ax7YxJLAuuhmlNkTl7Dp9UcoGFHFzDWCcfFJcfGDY4cR7I693GdPRTKwCMrLPOq2dDkRKHy9_xKk4TZB0uJE29wOmsSbizlJkcsDbmU6ZwoxPe_jpeq77_3VXp1?type=png)](https://mermaid.live/edit#pako:eNplkEFrwzAMhf-K0GmD5g_kMEiaHkcPGdsh7kGN5cXUsYutMErb_z4nS6EwncQn8d7jXbEPmrHE70jnAT4a5SFP1bUSmUaoDlAUbyutH7R-ptsH3T7TptvXLbQyaRsOK8rXm8IvPrahP7HAiw4_3gXSSSmf-sjs0xAEgoG0SKZXhbddF46pSBffFytd9Xb_9FhbmbXa_Ax7YxJLAuuhmlNkTl7Dp9UcoGFHFzDWCcfFJcfGDY4cR7I693GdPRTKwCMrLPOq2dDkRKHy9_xKk4TZB0uJE29wOmsSbizlJkcsDbmU6ZwoxPe_jpeq77_3VXp1)

## ASCII Logo

Generated from here: http://www.patorjk.com/software/taag/#p=display&f=Ogre&t=obs-stream-sync

## QR Code Format

In case [qr.syncer.live](https://qr.syncer.live) goes down, here's some general tech stuff to re-implement:

-   obs-sync-streams assumes the QR code only returns text that looks like this:
    `1676439460961.875`
-   It also allows for full-screening of the app, and generates the QR code pixel perfectly.
-   The correction level should be set to L for the least amount of changes per-frame.
