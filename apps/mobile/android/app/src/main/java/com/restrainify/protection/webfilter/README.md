# Website Filtering

Website filtering uses Android Private DNS setup and local VpnService fallback.

V1 must not install a user CA, decrypt TLS, or proxy all traffic through company servers.

## Resolver socket lifecycle

The local VPN forwards permitted DNS queries using encrypted DNS over TLS, with DNS over HTTPS as fallback.
Both transports must bind their TCP socket to an ephemeral local port before calling `VpnService.protect`.
Android creates the socket descriptor lazily: protecting a new, unbound `Socket` returns false.
Protect before connecting so resolver traffic cannot enter the DNS interception routes.
If protection fails, close the socket and fail closed; never fall back to plaintext DNS or skip TLS verification.

`EncryptedDnsWireTest.initializesResolverSocketsBeforeProtectionAndClosesRejectedSockets` covers initialization,
failure-before-connect, and resource cleanup for both encrypted transports.

## Device verification

Configure two installed apps with daily allowances above their recorded usage and enable app restriction access.
With Safe Browsing enabled, restart the controlled apps and request fresh content. Verify normal-domain DNS
resolution and adult-domain blocking as well as actual app rendering. Remove temporary rules and restore
permissions and filtering state afterward.

DNS success alone does not prove media delivery: a public resolver can select a different CDN edge than the
Wi-Fi router's resolver. If media still fails, compare DNS answers and HTTPS connectivity with filtering on
and off before attributing it to app limits or changing filtering policy.

