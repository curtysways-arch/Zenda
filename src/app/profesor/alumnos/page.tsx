
import GenericCourseSelector from "@/components/professor/GenericCourseSelector";

export default function GeneralProfessorAlumnos() {
    return (
        <GenericCourseSelector 
            title="Mis Alumnos" 
            subtitle="Selecciona un curso para ver la lista de alumnos."
            nextPath="/profesor/cursos/[courseId]/alumnos"
        />
    );
}
