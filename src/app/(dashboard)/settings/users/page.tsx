import { getUsers } from "@/lib/actions/users";
import { UserList } from "./user-list";

export default async function UsersPage() {
  const users = await getUsers();
  return <UserList users={users} />;
}
