// src/core/capabilities/registry.ts
import { BusinessCapabilities, CapabilityKey } from './types';

export function hasCapability(capabilities: BusinessCapabilities | null | undefined, capability: CapabilityKey): boolean {
  if (!capabilities) return false;
  return Boolean(capabilities[capability as keyof BusinessCapabilities]);
}

export function getActiveCapabilities(capabilities: BusinessCapabilities | null | undefined): CapabilityKey[] {
  if (!capabilities) return [];
  return (Object.keys(capabilities) as CapabilityKey[]).filter(
    (cap) => Boolean(capabilities[cap as keyof BusinessCapabilities])
  );
}
