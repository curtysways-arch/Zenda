
import GenericCourseSelector from "@/components/professor/GenericCourseSelector";

export default function GeneralProfessorClases() {
    return (
        <GenericCourseSelector 
            title="Gestión de Clases" 
            subtitle="Selecciona un curso para gestionar sus clases."
            nextPath="/profesor/cursos/[courseId]/clases"
        />
    );
}
