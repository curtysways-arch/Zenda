import prisma from '@/lib/prisma';

export const matchGeneratorService = {
    generateRoundRobinMatches(tournamentId: string, teams: any[]) {
        const matches: any[] = [];
        let roundIds: (string | null)[] = teams.map(t => t.id);

        // If odd teams, add bye
        if (roundIds.length % 2 !== 0) {
            roundIds.push(null);
        }

        const n = roundIds.length;
        const rounds = n - 1;

        for (let round = 0; round < rounds; round++) {
            for (let i = 0; i < n / 2; i++) {
                const teamAId = roundIds[i];
                const teamBId = roundIds[n - 1 - i];

                if (teamAId !== null && teamBId !== null) {
                    matches.push({
                        tournamentId,
                        teamAId,
                        teamBId,
                        round: (round + 1).toString(),
                        estado: 'pendiente'
                    });
                }
            }

            // Rotate keeping first element fixed
            const last = roundIds.pop()!;
            roundIds.splice(1, 0, last);
        }

        return matches;
    },

    generateEliminationBracket(tournamentId: string, teams: any[]) {
        const matches: any[] = [];
        const numTeams = teams.length;

        // Find next power of 2
        let nextPow2 = 1;
        while (nextPow2 < numTeams) nextPow2 *= 2;

        const numByes = nextPow2 - numTeams;
        let teamIdx = 0;

        for (let i = 0; i < nextPow2 / 2; i++) {
            if (teamIdx >= numTeams) break;

            const teamAId = teams[teamIdx++].id;
            let teamBId: string | null = null;

            // Only assign opponent if this slot has NO bye
            if (i >= numByes && teamIdx < numTeams) {
                teamBId = teams[teamIdx++].id;
            }

            matches.push({
                tournamentId,
                teamAId,
                teamBId: teamBId ?? null,
                round: 'Ronda 1',
                estado: teamBId ? 'pendiente' : 'jugado',
                scoreA: teamBId ? null : 1,
                scoreB: teamBId ? null : 0
            });
        }

        return matches;
    },

    async advanceWinner(tournamentId: string, match: any) {
        // Future: Create or update next-round matches based on winner
        // For now this is a no-op placeholder
        return;
    }
};
