import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createUser, deleteUser, listUsers, updateUser } from '@platform/users/api/usersApi'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: listUsers,
    refetchInterval: 15_000
  })
}

function useUserWrite<Input, Result>(write: (input: Input) => Promise<Result>, done: string) {
  const queryClient = useQueryClient()

  return useMutation<Result, Error, Input>({
    mutationFn: write,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      toast(done)
    }
  })
}

export function useCreateUser() {
  return useUserWrite(createUser, 'User added')
}

export function useUpdateUser() {
  return useUserWrite(updateUser, 'User updated')
}

export function useDeleteUser() {
  return useUserWrite(deleteUser, 'User deleted')
}
