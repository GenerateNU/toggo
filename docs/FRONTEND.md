# Frontend Practices

## 1. Component Design
| **Principle**                             | **Description**                                                                                                                                                          |
|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Variants for similar components       | For components with similar functionality but slight variations (e.g., buttons with different styles), create component variants.                                          |
| Use SVG over images                   | Prefer SVG images for scalability and better performance. They offer crisp quality on all screen sizes and are more flexible for styling (e.g., changing colors).         |
| Use a design system                   | A design system ensures consistent components, layouts, animations, and themes across the app, including reusable UI components, color schemes, typography, and spacing rules.       |
| Avoid deeply nested props             | Avoid passing deeply nested props to child components. If needed, use a **context provider** or state management library to share data, keeping the hierarchy simple.      |
| Avoid hardcoding fixed dimensions     | Avoid hardcoded pixel values or absolute positioning. Use relative units (e.g., percentages, flexbox, grid) to make components more flexible across different screen sizes. |
| Component flexibility                 | Design components to be adaptable to different screen sizes. Don't hardcode padding or margins; let the consumer define spacing as needed.                               |

---

## 2. User Experience (UX)
| **Scenario** | **Best Practices** |
|-------------|--------------------|
| Data loading | Skeleton screens or spinners. Set layout expectations early. |
| Data fails to load | Clear error message with retry option. Never fail silently. |
| No data available | Informative empty state with guidance (e.g., "Create your first item"). |
| Form submission | Disable button + show loading indicator to prevent duplicate requests. |
| Optimistic updates | Update UI immediately, rollback gracefully on failure. |
| Invalid input | Instant validation. Block submission until valid. |
| Submission succeeds | Toast, inline message, or visual confirmation. |
| Clickable elements | `cursor: pointer`, hover/pressed states for feedback. |
| Keyboard obscures input | Adjust layout to keep input and submit button visible. |
| Keyboard dismissal | Tap outside to dismiss keyboard. |
| View transitions | Smooth animations. Avoid abrupt changes. |
| Long-running actions | Progress indicator or step-based feedback. |
| Rapid input (search) | Debounce/throttle to reduce API calls. |
| Page navigation | Preserve scroll position, filters, and form state. |
| Destructive actions | Confirm with clear consequences before proceeding. |

---

## 3. Tanstack Query & Common Use Cases
When creating a component and having it fetch data from backend endpoints to display to users, repeatedly calling endpoints leads to unnecessary network traffic and slow performance. To solve this problem, we use Tanstack Query library to efficiently handle data fetching, caching, synchronization, and error retries.

> [!NOTE]
> Below are some common use cases, but there may be others. For more details, please refer to [official documentation](https://tanstack.com/query/v5/docs/framework/react/overview).

### Common Hooks

| Hooks              | Use Case                                    | Key Features                                                                                                      | Example                                                                                                   |
|--------------------|---------------------------------------------|------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **useQuery**       | Fetch data with a GET API call             | - Requires `queryKey` (cache key) <br> - Requires `queryFn` (fetch function)                                     | [Code](#usequery-example)                                                                                |
| **useInfiniteQuery** | Fetch data with a paginated GET API call  | - Requires `queryKey` <br> - Requires `queryFn` that supports pagination <br> - Includes `getNextPageParam` for infinite loading | [Code](#useinfinitequery-example)                                                                        |
| **useMutation**    | Mutate data with POST/PUT/DELETE API calls | - Includes `mutationFn` <br> - Supports `onSuccess` and `onError` callbacks <br> - Can invalidate queries for refetching | [Code](#usemutation-example)                                                                             |


### Examples

#### `useQuery` Example

```ts
const useUser = (id: string) => {
  return useQuery({
    queryKey: ["users", id], // should match with API endpoint, in this case /users/:id
    queryFn: getUser(id), // API call
    // other options
  });
};

// Use in components and can conditionally render based on loading, error or success
const { data, isLoading, error } = useUser(id);
```

#### `useInfiniteQuery` Example

```ts
const useUserPosts = (id: string) => {
  return useInfiniteQuery({
    queryKey: ["users", id, "posts"], // API endpoint with route /users/:id/posts
    queryFn: async ({ pageParam }) => {
      const response = await queryFunction(id, pageParam);
      return response;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor ?? undefined;
    },
  });
};

// Use in components and can conditionally render based on loading, error or success
const { data, isLoading, isLoadingNextPage, error, fetchNextPage, isFetchingNextPage } =
  useUserPosts(id);
```

#### `useMutation` Example

```ts
const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, content }) => createPost({ title, content }), // API call for creating post
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["posts"],
      });
    },
    onError: (error: Error) => {
      console.error("Error creating post:", error.message);
    },
  });
};

// Use in a component
const { mutate, isPending, error } = useCreatePost(); // can disable button while isPending

const handleSubmit = () => {
  mutate({ title, content });
};
```