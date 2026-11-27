import PeoplePage from "../../components/common/PeoplePage"; import { studentService } from "../../services/studentService";
export default function StudentsPage(){return <PeoplePage type="student" service={studentService}/>}
