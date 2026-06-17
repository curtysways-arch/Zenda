
import GenericCourseSelector from "@/components/professor/GenericCourseSelector";

export default function GeneralProfessorAsistencia() {
    return (
        <GenericCourseSelector 
            title="Asistencia" 
            subtitle="Selecciona un curso para ver sus clases y pasar asistencia."
            nextPath="/profesor/cursos/[courseId]/clases"
        />
    );
}
