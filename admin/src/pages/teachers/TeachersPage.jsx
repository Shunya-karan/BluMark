import PeoplePage from "../../components/common/PeoplePage"; import { teacherService } from "../../services/teacherService";
export default function TeachersPage(){return <PeoplePage type="teacher" service={teacherService}/>}
