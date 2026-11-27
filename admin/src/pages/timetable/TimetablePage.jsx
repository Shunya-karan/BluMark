import EmptyUnavailable from "../../components/common/EmptyUnavailable";
export default function TimetablePage() {
  return (
    <EmptyUnavailable
      title="Timetable management"
      detail="The timetable database model exists, but the timetable backend module is empty and unmounted. CRUD must be added before this page can operate."
    />
  );
}
