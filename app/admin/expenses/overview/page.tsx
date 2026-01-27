import { redirect } from 'next/navigation';

export default function ExpensesOverviewRedirect() {
    redirect('/admin/expenses');
}
