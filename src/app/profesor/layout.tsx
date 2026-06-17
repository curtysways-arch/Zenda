
import { getProfessorSession } from "@/lib/professorAuth";
import { redirect } from "next/navigation";
import ProfessorSidebar from "@/components/professor/ProfessorSidebar";

export default async function ProfessorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getProfessorSession();

    if (!session) {
        redirect('/');
    }

    return (
        <div className="flex min-h-screen bg-[#f8fafc] flex-col md:flex-row font-sans selection:bg-emerald-500/20">
            {/* 📱 TOP SHIMMER FOR NATIVE LOOK */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 z-[200]" />
            
            <ProfessorSidebar />
            
            <main className="flex-1 overflow-x-hidden pb-32 md:pb-0 relative">
                {/* 🌌 SUBTLE BACKGROUND ELEMENTS */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10 pointer-events-none transition-all duration-1000" />
                <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 pointer-events-none transition-all duration-1000" />
                
                <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
