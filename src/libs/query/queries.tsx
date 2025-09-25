/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";


// ============================================================
// AUTH QUERIES
// ============================================================

// export const useCreateUserAccount = () => {
//   return useMutation({
//     mutationFn: (user: INewUser) => createUserAccount(user),
//   });
// };

// export const useSignInAccount = () => {
//   return useMutation({
//     mutationFn: (user: { reference: string; password: string }) =>
//       signInAccount(user),
//   });
// };

// export const useSignOutAccount = () => {
//   return useMutation({
//     mutationFn: signOutAccount,
//   });
// };

// // ============================================================
// // POST QUERIES
// // ============================================================

// // export const useGetPosts = () => {
// //   return useInfiniteQuery({});
// // };





// export const useGetDepartments = () => { 
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_DEPARTMENTS],
//     queryFn: getDepartments,
//   });
  
// }

// export const useGetRecentPosts = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
//     queryFn: getRecentPosts,
//   });
// };

// export const useGetClasses = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_CLASSES],
//     queryFn: getClasses,
//   });
// };

// export const useCreateList = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: (list: INewList) => createList(list),
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
//       });
//     },
//   });
// };

// export const useGetPostById = (postId?: string) => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId],
//     queryFn: () => getPostById(postId),
//     enabled: !!postId,
//   });
// };

// export const useGetClassById = (classId?: string) => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_CLASS_BY_ID, classId],
//     queryFn: () => getClassById(classId),
//     enabled: !!classId,
//   });
// };



// export const useGetClassListById = (classId?: string) => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_CLASS_LIST_BY_ID, classId],
//     queryFn: () => getClassListById(classId),
//     enabled: !!classId,
//   });
// };


// export const useGetCourseClassesListById = (departmentId: string, year: number) => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_COURSE_CLASSES_LIST_BY_ID],
//     queryFn: () => getCourseClassesListById(departmentId, year),
//   });
// };


// export const useGetSemesters = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_SEMESTERS,],
//     queryFn: () => getSemesters(),
//   });
// };


// export const useGetUserPosts = (userId?: string) => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_USER_POSTS, userId],
//     queryFn: () => getUserPosts(userId),
//     enabled: !!userId,
//   });
// };



// // ============================================================
// // USER QUERIES
// // ============================================================

// export const useGetCurrentUser = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_CURRENT_USER],
//     queryFn: getCurrentUser,
//   });
// };


// export const useGetUserById = (userId: string) => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.GET_USER_BY_ID, userId],
//     queryFn: () => getUserById(userId),
//     enabled: !!userId,
//   });
// };