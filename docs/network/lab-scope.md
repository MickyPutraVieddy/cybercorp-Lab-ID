# CyberCorp Lab Network Scope

## Lab Hosts

| Host | IP Address | Role |
|---|---|---|
| Kali Linux | 192.168.64.2/24 | Red Team |
| Windows | 192.168.64.3/24 | Enterprise Endpoint |
| Ubuntu | 192.168.64.6/24 | Server and Administration |

## Ubuntu Network Interfaces

| Interface | IP Address | Purpose |
|---|---|---|
| enp0s1 | 192.168.64.6/24 | Primary lab network |
| enp0s2 | 192.168.128.2/24 | Secondary network |
| docker0 | 172.17.0.1/16 | Docker bridge |

## Network Access Controls

- Ubuntu UFW is enabled.
- Default incoming policy: deny.
- Default outgoing policy: allow.
- SSH (TCP/22) is allowed from 192.168.64.0/24.
- SSH password authentication is disabled.
- SSH public-key authentication is enabled.
- Root SSH login is disabled.

## Connectivity Validation

- Ubuntu to Kali: passed.
- Ubuntu to Windows: passed.
- Kali to Ubuntu: passed.
- Kali to Windows: passed.
- Windows to Kali: passed.
- Windows to Ubuntu: passed.
- All recorded ping tests had 0% packet loss.
