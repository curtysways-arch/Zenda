export class PinchoFriendlyCodeService {
    public static formatFriendlyCode(sequenceNumber: number, prefix: string = 'PIN'): string {
        const baseNumber = 250000 + sequenceNumber;
        const cleanPrefix = (prefix || 'PIN').toUpperCase().replace(/[^A-Z]/g, '');
        return `${cleanPrefix}-${baseNumber}`;
    }

    public static parseSequenceFromCode(friendlyCode: string): number | null {
        if (!friendlyCode || !friendlyCode.includes('-')) return null;
        const parts = friendlyCode.split('-');
        const num = parseInt(parts[1], 10);
        if (isNaN(num)) return null;
        return num - 250000;
    }
}
