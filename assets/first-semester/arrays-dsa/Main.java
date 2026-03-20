//CHAPTER-6- ARRAYS DATA STRUCTURES ALGORITHMS
//THEORY
  //A. ARRAYS- INTRODUCTION- RN

import java.util.Arrays;

class Main {
  public static void main(String[] args) {
    
  //B. DECLRATION AND CREATION OF ARRAYS- RN
    //I. DECLARATION
      int[] a;
      int b[];
      int []c;
      
      //Note: We mainly declare an array first of the kind, but can use the other two also.
      

    //II. CREATION OF ARRAY
      a = new int[10];
      b = new int[20];
      c = new int[30];
      
      /* Note: As we discussed size of array are fixed, we fix it while craetion. The size data type can be integer, short, 
         byte and char. */
      /* Note: We should remember as we create an array, in heap an array gets created and at all the index 0 is
         initialised. */

    
    //III. INITIALSATION OF ARRAY
      //Initialisation of array can be done in two ways:
      //1. Inialise using Index: This is done when we are not aware with the values we want to initailise while creation.
      a[0] = 11;
      a[1] = 12;
      a[2] = 13;
      a[3] = 14;
      a[4] = 15;
      a[5] = 16;
      a[6] = 17;
      a[7] = 18;
      a[8] = 19;
      
      // Note: Here the 9th index is not initialised the, it will be filled with 0 as initialised while creation.
      /* Note: Array Objects are mutable hence the changes can be made inside the object. For now we consider that this is 
         the initailisation step but in Arrays Advanced we will see the initialisation is done at the time of creation only 
         with values 0 in every index. Here in this step using mutable property of arrays we just change them. */

    
      //2. Initialsation while decalring: This is done when we are already aware 
      //with the values to be initialised.
      int[] d = {11, 12, 13, 14, 15, 16, 17, 18, 19, 20};
      
      /* Note: All the three steps is done at one place. Although we don't use new keyword for the craetion, that is done as 
         shortcut. Size is automatically calculated, need not to be set. */


      //How to Change an Array Element Accessing it?
      a[4] = 2222;
      d[4] = 3333;
      
      /* Note: As we have already discussed Arrays Objects are mutable thus we can change the internal structure of the 
         object unlike Strings. In third step we are already doing this. */

    

  //C. TYPES OF ARRAYS- RN
    //I. SINGLE DIMENSION ARRAY- ALREADY DISCUSSED
    
    //II. MULTI-DIMENSIONAL ARRAY
      //Declaration:
        int[][] e;
      
      //Creation:
        e = new int[3][2];       //IHM: {{0,0}, {0,0}, {0,0}}

      //Initialisation:
        e[0][0] = 2;             //IHM: {{2,0}, {0,0}, {0,0}}
        e[0][1] = 3;             //IHM: {{2,3}, {0,0}, {0,0}}
        e[1][0] = 4;             //IHM: {{2,3}, {4,0}, {0,0}}
        e[1][1] = 5;             //IHM: {{2,3}, {4,5}, {0,0}}
        e[2][0] = 6;             //IHM: {{2,3}, {4,5}, {6,0}}
        e[2][1] = 8;             //IHM: {{2,3}, {4,5}, {6,8}}

      //Accessing:
        e[2][1] = 888;           //IHM: {{2,3}, {4,5}, {6,888}}

      //Declaration, Creation and Initialisation at same place:
        int[][] f = {{2,3}, {4,5}, {6,8}};


    
  //D. LENGTH OF ARRAY
    //I. SINGLE DIMENSION ARRAY
       int g = a.length;

    
    //II. MULTI-DIMENSIONAL ARRAY
       int h = e.length;
       int i = e[0].length;


}




//EXERCSIES
  //EXERCISE-1- RPDF

  //EXERCISE-2(75)

    //QUESTION-1 Build Array from Permutation-REARRANGEMENT(Formula Given)
    //Source-https://leetcode.com/problems/build-array-from-permutation/
    
      public int[] buildArray(int[] nums) {
        int[] ans = new int[nums.length];
        for(int i=0; i<nums.length; i++){
          ans[i] = nums[nums[i]];
        }
        return ans;
      }
      /* T1: REARRANGEMENT OF ARRAYS
          S1- Create an Array.
          S2- Mark them with index in the Heap Memory.
          S3- Assign the New Array with the values of Old Array according to the given Formula in Loop. */



  
    //QUESTION-2 Doubling of Array-REARRANGEMENT/PARALLEL ACCESSING
    //Source-https://leetcode.com/problems/concatenation-of-array/
    
      public int[] getConcatenation(int[] nums) {
        int[] ans = new int[nums.length*2];
        for(int i=0; i<nums.length; i++){
          ans[i] = ans[i+nums.length] = nums[i];   //Smart Move: ans[i] = nums[i];  ans[i+nums.length]= nums[i];
        }
        return ans;
      }
      //T2: DOUBLING- Create Array of double size insert 0th index and  0 + Length(Old) index simulataneously.

  

  
    //QUETSION-3 Running Sum of 1D Array-SERIES/P-COMPARISON
    //Source-https://leetcode.com/problems/running-sum-of-1d-array/

      public int[] runningSum(int[] nums) {
        for(int i=1; i<nums.length; i++){
          nums[i] = nums[i] + nums[i-1];
        }
        return nums;
      }
      /* T3: PREFIX SUM(P-COMPARISON)- Dont use Sum Array for this question so that SC- O(1). 
         Update the same array starting from 1st index as the sum array of 0th index will be unchanged. */

  

  
    //QUESTION-4 Shuffle the Array-REAARRANGEMENT/PARALLEL ACCESSING
    //Source-https://leetcode.com/problems/shuffle-the-array/
  
      public int[] shuffle(int[] nums, int n) {
        int[] ans = new int[2 * n];
        for(int i=0; i<n; i++){
            ans[2 * i] = nums[i];
            ans[2 * i + 1] = nums[n + i];
        }
        return ans;
      }
      /* T1(Updated): Rearrangement got an additional step.
           S3: Create Formulae if not provided. */
      // T4: Even-Odd Iteration- Iterate using the index seen above. 



    
    //QUESTION-5 Kids With the Greatest Number of Candies-MAXIMUM OF ARRAY/O-COMPARISON
    //Source-https://leetcode.com/problems/kids-with-the-greatest-number-of-candies/description/
  
      public List<Boolean> kidsWithCandies(int[] candies, int extraCandies) {
        List<Boolean> ans = new ArrayList<>();
        int max=0;
        for(int i=0; i<candies.length; i++){
          if(max<candies[i]){
            max= candies[i];
          }
        }
        for(int i=0; i< candies.length; i++){
            ans.add(candies[i]+extraCandies>=max?true: false);
        }
        return ans;
      }
      /* T5: MAXIMUM AMONG THE ARRAY- Take a integer value minimum value and start comparing elements
         whatever be the bigger value update the max one. Integer.MIN_VALUE */

  
  

    //QUESTION-6 Number of Good Pairs-FREQUENCY COUNT
    //Source-https://leetcode.com/problems/number-of-good-pairs/description/
  
     public int numIdenticalPairs(int[] nums) {
        int[] freq = new int[101];
        for(int i=0; i< nums.length; i++){
          freq[nums[i]]++;
        }
        int sum =0;
        for(int i=0; i< freq.length; i++){
          int k= freq[i];
          sum = sum + (k*(k-1)/2);
        }
        return (sum);
      }
      /* T6: BUCKET METHOD- Make a array of 100(greatest value) size. Traverse through the nums array 
        and put the value of nums as the index of bucket array and increase the frequency of element. 
        Finally we will get Bucket Array. */
      // T7: NUMBER OF PAIRS NON REVERSED- nC2 = n*(n-1)/2 Where n is the total numbers of elements.
    

  
  
    //QUESTION-7 How Many Numbers Are Smaller Than the Current Number-FREQUENCY COUNT
    //Source-https://leetcode.com/problems/how-many-numbers-are-smaller-than-the-current-number/description/
    
      public int[] smallerNumbersThanCurrent(int[] nums) {
        int[] count = new int[101];
        int[] res = new int[nums.length];
          
        for (int i =0; i < nums.length; i++) {
          count[nums[i]]++;
        }
          
        for (int i = 1 ; i <= 100; i++) {
              count[i] += count[i-1];    
        }
          
        for (int i = 0; i < nums.length; i++) {
          if (nums[i] == 0)
            res[i] = 0;
          else 
            res[i] = count[nums[i] - 1];
        }
        return res;     
      }
  

  
  
    //QUESTION-8 Two Sum- PAIR COMPARISON
    //Source-https://leetcode.com/problems/two-sum/description/
    
      public int[] twoSum(int[] nums, int target) {
        int[] arr = new int[2];
        for(int i=0; i<nums.length-1; i++){
          for(int j=i+1; j<nums.length; j++){
            if(nums[i]+nums[j]==target){
              arr[0] = i;
              arr[1] =j;
            }
          }
        }
        return arr;
      }
      //A1: PUSH VALUE-COMPARISON- Each number is comapred only once.
  

  
    
    //QUESTION-9 Check if the Sentence Is Pangram
    //Source-https://leetcode.com/problems/check-if-the-sentence-is-pangram/description/
  
      public boolean checkIfPangram(String sentence) {
        boolean f = false;
        for(char i='a'; i<='z'; i++){
          if(sentence.contains(String.valueOf(i))){
            f = true;
          }
          else{
            f = false;
            break;
          }
        }
        return f;
      }
      // FX: String.valueOf()- Coverts any data type to String.
      // T9: ALPHABETICAL SERIES IN LOOP- Letters can be iterated in loop. char i = 'a' + 1 = 'b'.
      /* T10: SUBSETSUPERSET- Whenever we use contains() we have to think about the superset(Here the Sentence), 
         may be a character or a word or a sentence can be the subset, looped or single. */




    //QUESTION-10  Count Items Matching a Rule(A, Strings)


  

    //QUESTION-11 Find the Highest Altitude
    //Source-https://leetcode.com/problems/find-the-highest-altitude/description/

      public int largestAltitude(int[] gain) {
        int max=0;
        int current=0;
        for(int i=0;i<gain.length;i++){
            current+=gain[i];
            max=Math.max(current,max);
        }
        return max;
     }  
     /* T11: PARALLEL MAX ANALYSER- Instead of running an another for loop we can calculate the max
      with the same for loop. Update max parallely when we got the sum array element comparing 
      the previous max. */

  

  
    //QUESTION-12 Find Numbers with Even Number of Digits
    //Source-https://leetcode.com/problems/find-numbers-with-even-number-of-digits/description/
  
      public int findNumbers(int[] nums) {
        int count =0;
        for(int i=0; i<nums.length; i++){
          int a = (int)(Math.log10(nums[i]))+1;
          if(a%2==0){
            count++;
          }
        }
      return (count);
      }
      /* T12: NUMBER OF DIGITS IN A NUMBER- Using while loop(n!=0){n%10, n/10} => O(N). 
         Using {(int))log(n) base 10} + 1] => O(1). */

  

  
    //QUESTION-13 Find N Unique Integers Sum up to Zero
    //Source-https://leetcode.com/problems/find-n-unique-integers-sum-up-to-zero/description/

      public int[] sumZero(int n) {
        int[] answer = new int[n];
          for (int i = 1; i<n; i+=2) {
            answer[i-1]=i;
            answer[i]=-i;
          }
          return answer;
      }
      /* T13: ODD LINEAR TRAVERSING- In such traversing pointer access all the odd indices. 
         So values can be filled using i and i-1. But if there is an array of odd size, it will not fill 
         the last element. */
      

  

    //QUESTION-14 Create Target Array in the Given Order
    //Source-https://leetcode.com/problems/create-target-array-in-the-given-order/description/

      public int[] createTargetArray(int[] nums, int[] index) {
        int t[]= new int [nums.length];
        ArrayList<Integer> rb= new ArrayList<>();
        
        for(int i=0; i<nums.length; i++){
           rb.add(index[i], nums[i]);
        }
          
        for(int i=0; i<nums.length; i++){
           t[i]=rb.get(i);
        }
        return t;
      }
      /* T14: ARRAYLIST INSERTION WITH INDEX: If we insert value at a index already inserted then it
         reinsert the new value at the particular index and push the old value one index ahead. */


  
  
    //QUESTION-15 Minimum Cost to Move Chips to The Same Position-COUNT EVEN ODD-II
    //Source-https://leetcode.com/problems/minimum-cost-to-move-chips-to-the-same-position/description/
  
        public int minCostToMoveChips(int[] position) {
          int even = 0;
          for(int a: position){
            if(a%2==0){
                even++;
            }
          }
        return Math.min(even, position.length-even);
        }
        /* T15: VIRTUAL REALITY TOOLS- Question will seems to have complex shifting or removals or may 
           something more complex, but it may be that it can be solved via COUNTING TOOL, EVEN/ODD, SUMMMITION
           basic tool. arr = [2,2,4,8,1000], cost=0; arr = [1,1,3,9,1001], cost = 0. Minimum of odd/even. */



  
      //QUESTION-16 Remove Duplicates from Sorted Array
      //Source-https://leetcode.com/problems/remove-duplicates-from-sorted-array/description/
  
        public int removeDuplicates(int[] arr) {
          int i=0;
          for(int j=1;j<arr.length;j++){
            if(arr[i]!=arr[j]){
              i++;
              arr[i]=arr[j];
            }
          }
          return i+1; 
        }
        /* A2: SIMILARITY CHECK ALGORITHM- Take two pointers in a loop, i=0, j=1, compare both elements increase
           i only when the both values are different. Swap the jth element with the increased ith element.
           Thus we can remove duplicates using inplace removal tech. */


  
  
      //QUESTION-17 Plus One
      //Source-https://leetcode.com/problems/plus-one/

        public int[] plusOne(int[] digits) {
          for (int i = digits.length - 1; i >= 0; i--) {
      	    if (digits[i] < 9) {
      		    digits[i]++;
      		    return digits;
      	    }
      	  digits[i] = 0;
          }
      
          digits = new int[digits.length + 1];
          digits[0] = 1;
          return digits;
        }


  
  
      //QUESTION-18 Plus K
      //Source-https://leetcode.com/problems/plus-k/



  
      //QUESTION-19 Sqrt(x)- MATHS PROBLEM- SOLVED USING NEWTON RAPSON METHOD.
      //Source-https://leetcode.com/problems/sqrtx/description/
  

  

      //QUESTION-20 Kth Missing Positive Number          
      //Source-https://leetcode.com/problems/kth-missing-positive-number/description/

      


      //QUESTION-21 Intersection of Two Arrays-II- TWO ARRAYS COMPARISON
      //Source-https://leetcode.com/problems/intersection-of-two-arrays-ii/description/
  
        public int[] intersect(int[] nums1, int[] nums2) {
          Arrays.sort(nums1);
          Arrays.sort(nums2);
          ArrayList<Integer> arr = new ArrayList<Integer>();
          int i = 0, j = 0;
          while(i < nums1.length && j < nums2.length){
            if(nums1[i] < nums2[j]) {
              i++;
            }
            else if(nums1[i] > nums2[j]){
              j++;
            }
            else{
              arr.add(nums1[i]);
              i++;
              j++;
            }
          }
          int[] output = new int[arr.size()];
          int k = 0;
          while(k < arr.size()){
            output[k] = arr.get(k);
            k++;
          }
          return output;
        }


  
  
      //QUESTION-22 Intersection of Two Arrays-I-TWO ARRAYS COMPARISON
      //Source-https://leetcode.com/problems/intersection-of-two-arrays-ii/description/
  
        public int[] intersection(int[] nums1, int[] nums2) {
            Arrays.sort(nums1);
            Arrays.sort(nums2);
            Set<Integer> uniqueSet = new HashSet<>();
            int i = 0, j = 0;
            while(i < nums1.length && j < nums2.length){
              if(nums1[i] < nums2[j]) {
                i++;
              }
              else if(nums1[i] > nums2[j]){
                j++;
              }
              else{
                uniqueSet.add(nums1[i]);
                i++;
                j++;
              }
            }
             
            int[] output = new int[uniqueSet.size()];
            int k = 0;
            for (int value : uniqueSet) {
              output[k] = value;
              k++;
            }
            return output;
        }
        /* A3: BEGIN 23' ALGORITHM-To be applied on two sorted arrays for comparing and moving ahead with array which is smaller value 
           and moving ahead with both when value matches. */

  

  
    //QUESTION-23 BINARY SEARCH
    //Source-https://leetcode.com/problems/binary-search/
  
      public int bsearch(int[] nums, int target) {
        int start=0, end = nums.length - 1;
      
        while(start <= end){
          int mid = start + (end - start) / 2;
          if(nums[mid] == target){
            return mid;
          }
          else if(nums[mid] < target ){
            start = mid + 1;
          }
          else{
            end = mid - 1;
          }
        }
        return -1;
      }
      /* A4: BINARY SEARCH ALGORITHMS- Target Comparison for Serach Space. 
          - mid-> If there are even search space then first is mid among two mids. 
          - mid-> s + (e-s)/2 
          - mid-> If e == s, then mid = e == s
          - Movements of e is always towards left
          - Movement of s is always towards right */
    



  
    //QUESTION-24 Valid Perfect Square-SERIES
    //Source-https://leetcode.com/problems/valid-perfect-square/description/
  
      public boolean isPerfectSquare(int num) {
        if(num<2)
          return true;
  
        long first=0;
        long last=num;
  
        while(first<=last){
          long mid=first+(last-first)/2;
          if(mid*mid==num){
            return true;
          }
          else if(mid*mid>num){
            last=mid-1;
          }
          else{
            first=mid+1;
          }
        }
        return false;
      }
      // Refer BS.


  

    //QUESTION-25 Arranging Coins-SERIES
    //Source-https://leetcode.com/problems/arranging-coins/description/
  
      //Approach-1 Prefix Sum TC: O(N) 
      public int arrangeCoinsSolution1(int n) {
        long sum =0; boolean f = false; int i=1;
        for(; i<=n; i++){
          sum = sum + i;
          if(sum == n){
            f= true;
            break;
          }
          else if(sum>n){
            f = false;
            break;
          }
        }
        return f?i:i-1;
      }
      // Refer Prefix Sum

  
      //Approach-2 Summition and Shreedharacharya Formula TC: O(1) 
      public int arrangeCoinsSolution2(int n) {
           return (int)(Math.sqrt(2 * (long)n + 0.25) - 0.5);
      }
      //T16: Summition of N and Shreedharacharya Formula. √(2S + 0.25) - 0.5

  

  
    //QUESTION-26 Find Smallest Letter Greater Than Target
    //Source-https://leetcode.com/problems/find-smallest-letter-greater-than-target/description/
  
      public char nextGreatestLetter(char[] letters, char target) {
        int start = 0;
        int end = letters.length-1;

        while(start <= end){
          int mid = start + (end-start)/2;
  
          if(letters[mid] > target){
            end = mid - 1;
          }
          else{
            start = mid + 1;
          }
        }
        return letters[start % letters.length];
      }
      /* T17: FAKING TARGET(DEADZONE)- When Target is not present in the Array.
        - If Target is not in the Array then in the end, s == e == m, now either s will move right 
          or end will move left and loop will break. 
        - If Target is not in the Array then either all three will be on the number that is greater
          than the target or smaller than the target. If it lands on the number greater than the 
          target end will move back to mid-1 and start will remain at it.
        - If Target is not in the Array then all three will be on the number that will be either just
          smaller or just bigger. Start will be always on the number just greater than target in
          the array. And the end will be on the number just lesser than the target. 
        - In this quetsion there can be a chance that target is present, but still we have to search 
          for the number greater than target, so we can use == in start= mid + 1. In such case start will
          be on the number greater than target and end will be on the target. If we use == in end = mid -1,
          end will be on the number just smaller than target and start will be on the number.*/
  


  

    //QUESTION-27 Search Insert Position
    //Source-https://leetcode.com/problems/search-insert-position/description/
  
      public int searchInsert(int[] nums, int target) {
        int left = 0 ;
        int right = nums.length-1;
        while (left<=right){
          int mid  = left + (right-left)/2;
          if (nums[mid] == target) {
              return mid;
          }
          if (nums[mid] < target) {
              left = mid + 1;
          } 
          else {
              right = mid - 1;
          }
        }
        return left;
      }
      // Refer-FAKING TARGET(DEADZONE).


  
  

    //QUESTION-28 Check If N and Its Double Exist
    //Source-https://leetcode.com/problems/check-if-n-and-its-double-exist/description/

      //Approach-1 Push Value-II TC: O(N SQ)
      public boolean checkIfExist1(int[] arr) {
  	    int n = arr.length;
          for (int i = 0; i < n; i++) 
            for (int j = 0; j < n; j++) 
                if (i != j && arr[i] == 2 * arr[j]) 
                  return true;
          return false;
      }
      /* A5: PUSH VAUE ALGORITHMS-II- Number of Comparisons= (n^2)-n. Repeated Pairs are formed. TC: O(n^2) 
            - For Example: [10,2,5]- (10,2), (10, 5), (2,10), (2,5), (5,10), (5,2)
            - Number is selected making the Array the Search Space for Linear Traversal. */

  
      //Approach-2 Binary Search TC: O(NlogN)
      public boolean checkIfExist2(int[] arr) {
          Arrays.sort(arr);
          for (int i = 0; i < arr.length; i++) {
              int target = 2 * arr[i];
              int lo = 0, hi = arr.length - 1;
              while (lo <= hi) {
                  int mid = lo + (hi - lo) / 2;
                  if (arr[mid] == target && mid != i) 
                      return true;
                  if (arr[mid] < target) 
                      lo = mid + 1;
                  else 
                      hi = mid - 1;
              }
          }
          return false;
      }
      /* T18: PUSH VALUE-II-> LINEAR BINARY SEARCH- Linearly Moving and Searching in the same array using BS.
             TC: O(nlogn) */


  

    //QUESTION-29 Special Array With X Elements Greater Than or Equal X
    //Source-https://leetcode.com/problems/special-array-with-x-elements-greater-than-or-equal-x/description/
  
      public int specialArray(int[] arr) {

        //Step-1 Calculated Maximum:
        int max=0,sum=0,k=0;
        for(int i=0; i< arr.length; i++) {
            if (arr[i] > max) {
                max = arr[i];
            }
        }

        //Step-2 Filling Bucket:
        int[] bucket = new int[max+1];
        for(int i=0; i< arr.length; i++){
            bucket[arr[i]]++;
        }

        //Step-3 Calculated Sum from Back:
        int[] sumArr = new int[bucket.length];
        for(int i= bucket.length-1; i>=0; i--){
            sum = sum + bucket[i];
            sumArr[i] = sum;
        }

        //Step-4 Traversed through sum array to check k==sum[i]:
        for(; k< bucket.length; k++){
            if(sumArr[k]==k){
                return (sumArr[k]);
            }
        }
      return -1;  
      }
      /* Refer BUCKET ALGORITHMS AND PREFIX SUM Here Traversing is being done on Whole Numbers and Check
         Traversing in Array. */

  
  

    //QUESTION-30 Guess Number Higher or Lower
    //Source-https://leetcode.com/problems/guess-number-higher-or-lower/description/
  
       public int guessNumber(int n) {
        if (guess(n) == 0) return n;
        if (guess(1) == 0) return 1;
        int right = n - 1, left = 2;
        n /= 2;
        while (guess(n) != 0) {
          int g = guess(n);
          if (g > 0) {
            left = n;
            n = right - (right - n) / 2;
          } 
          else {
            right = n;
            n = left + (n - left) / 2;
          }
        }
        return n;
      }


  

    //QUESTION-31 First Bad Version
    //Source-https://leetcode.com/problems/first-bad-version/description/
  
      public int firstBadVersion(int n) {
        int f = 1, l = n;
        while(f<=l){
          int m = f+(l-f)/2;
          if(!isBadVersion(m)){
            f = m+1;
          }
          else{
            l = m-1;
          }
        }
        return f;
      }


  

    //QUESTION-32 Fair Candy Swap
    //Source-https://leetcode.com/problems/fair-candy-swap/description/
  
      //Approach-1-Push Value-II Algorithms TC: O(n sq)
      public int[] fairCandySwap1(int[] A, int[] B) {
          int sa=0,sb=0;
          for(int i=0;i<A.length;i++)
              sa+=A[i];
          for(int i=0;i<B.length;i++)
              sb+=B[i];
          int diff=(sa-sb)/2;
          for(int i=0;i<A.length;i++)
              for(int j=0;j<B.length;j++)
                  if(A[i]-B[j]==diff)
                      return new int[]{A[i],B[j]};
          return null;
      }
      // A5: PUSH VALUE ALGORITHM-II- Every Number is compared twice.

  
      //Approach-2-Binary Seach Algorithms TC: O(n logn)
      public int[] fairCandySwap2(int[] aliceSizes, int[] bobSizes) {
        int aliceTotal = 0;
        int bobTotal = 0;
        
        for (int candies : aliceSizes)
          aliceTotal += candies;
        for (int candies : bobSizes)
          bobTotal += candies;

        Arrays.sort(bobSizes);

        int m = aliceSizes.length, n = bobSizes.length;
        
        for (int i = 0; i < m; i++) {      
          int target = (bobTotal + 2 * aliceSizes[i] - aliceTotal) / 2;
          if (binarySearch(bobSizes, target))
            return new int[] { aliceSizes[i], target };
        }

        return new int[0];
      }
     
      private boolean binarySearch(int[] arr, int target) {
        int l = 0, r = arr.length - 1;
        while (l <= r) {
          int m = l + (r - l) / 2;
          if (target < arr[m])
            r = m - 1;
          else if (target > arr[m])
            l = m + 1;
          else
            return true;
        }
        return false;
      }

  
      //Approach-3- HashSet Data Structure TC: O(n) SC: O(n)
      public int[] fairCandySwap3(int[] aliceSizes, int[] bobSizes) {
          int[] ans = new int[2];

          int sumAlice = 0;
          for (int a : aliceSizes)
              sumAlice += a;

          int sumBob = 0;
          Set<Integer> bobSet = new HashSet<>();
          for (int b : bobSizes) {
              sumBob += b;
              bobSet.add(b);
          }

          int targetDiff = (sumBob - sumAlice) / 2;
          for (int aliceSize : aliceSizes) {
              int bobSize = aliceSize + targetDiff;
              if (bobSet.contains(bobSize)) {
                  ans[0] = aliceSize;
                  ans[1] = bobSize;
                  return ans;
              }
          }

          return ans;
      }


  

    //QUESTION-33 Bubble Sort
    //Source-https://www.geeksforgeeks.org/problems/bubble-sort/1

      public static int[] bubbleSort(int[] arr){
          for(int i=0; i< arr.length-1; i++){
              boolean swap = false;
              for(int j=1; j<arr.length-i; j++){
                  if(arr[j-1]>arr[j]){
                      int temp = arr[j-1];
                      arr[j-1] = arr[j];
                      arr[j] = temp;
                      swap = true;
                  }
              }
              if(!swap){
                  break;
              }
          }
          return arr;
      }
      /* A6: BUBBLE SORT ALGORITHM- Here max element bubbles up at every pass.
          - Number of Passes = n-1
          - Total Number of Comparison >= Total Number of Swaps
          - For every pass if the size of search space is x the number of P-Comparison = x-1 || n-i-1
          - Worst Case TC = O(nsq): Number of Swaps = Number of Comparison = S(n-1)
          - Best Case TC = O(n); Number of Comparison = n-1, Number of Swaps = 0
          - Bubble Sort is used the Array is partially sorted but the bigger numbers are misarranged,
            ex- [5,1,2,3,4] */





    //QUESTION-34 Selection Sort
    //Source-https://www.geeksforgeeks.org/problems/selection-sort/1

      public static int[] selectionSort(int[] arr){
          for (int i = 0; i < arr.length - 1; i++) {
              int lastIndex = arr.length - i - 1;
              int max = 0;
              for (int j =0; j <=lastIndex; j++) {
                  if (arr[j] > arr[max]) {
                      max = j;
                  }
              }
              int temp = arr[max];
              arr[max] = arr[lastIndex];
              arr[lastIndex] = temp;
          }
          return arr;
      }
      /* A7: SELECTION SORT- Find max in every pass and swap it with the lastIndex
          - Number of Passes = n-1
          - Total Number of Comparison = S(n-1)
          - Total Number of Comparison in Each Pass = n - i using O-Comparison
          - Number of Swap <= Number of Passes
          - Worst Case TC = O(nsq)
          - Best Case TC = O(nsq) */




    //QUESTION-35 Insertion Sort
    //Source-https://www.geeksforgeeks.org/problems/insertion-sort/1

      public static int[] insertionSort(int[] arr){
          for(int i =0; i< arr.length-1; i++){
              for(int j=i+1; j>0; j--){
                  if(arr[j]<arr[j-1]){
                      int temp = arr[j];
                      arr[j] = arr[j-1];
                      arr[j-1]= temp;
                  }
                  else{
                      break;
                  }
              }
          }
          return arr;
      }




    //QUESTION-36 Cyclic Sort(R)
    //Source-https://www.geeksforgeeks.org/problems/cyclic-sort/1



  
    //QUESTION-37 How Many Numbers Are Smaller Than the Current Number(REPEATED)
    //Source-https://leetcode.com/problems/how-many-numbers-are-smaller-than-the-current-number/description/
    



    //QUESTION-38 Contains Duplicate
    //Source-https://leetcode.com/problems/contains-duplicate/description/

      //Approach-1 P-Comparison Algorithm+ Sorting TC: O(nlogn)
      public boolean containsDuplicate1(int[] nums) {
          Arrays.sort(nums);
          int n = nums.length;
          for (int i = 1; i < n; i++) {
              if (nums[i] == nums[i - 1])
                  return true;
          }
          return false;
      }
  
      //Approach-2 HashSet Data Structure TC: O(n) SC: O(n)
      public boolean containsDuplicate2(int[] nums) {
          Set<Integer> set = new HashSet();
          for(int i = 0; i < nums.length; i++) {
              if(set.contains(num[i]))
                return true;

              set.add(num); 
          }
          return false;
      }




    //QUESTION-39 Two Sum II - Input Array is Sorted(R)


  
  
    //QUETSION-40 Third Maximum Number
    //Source-https://leetcode.com/problems/third-maximum-number/description/
  
      public int thirdMax(int[] nums) {
          long m1=Long.MIN_VALUE, m2=Long.MIN_VALUE, m3=Long.MIN_VALUE;
          for(int n: nums){
              if(n>m3){
                  m1=m2;
                  m2=m3;
                  m3=n;
              }
              else if(n>m2 && n<m3){
                  m1=m2;
                  m2=n;
              }
              else if(n>m1 && n<m2){
                  m1=n;
              }
          }
          return m1==Long.MIN_VALUE ? (int)m3 : (int)m1;
      }
      /*T19: THIRD MAX- Case-1-> max<arr[i], then upadte all three. Case-2-> arr[i]<max but arr[i]>smax,
        then update smax and tmax. Case-3-> arr[i]<smax but arr[i]>tmax, then update only tmax. */



  
    //QUESTION-41 Peak Index in a Mountain Array(R)



  
    //QUESTION-42 Missing Number-CYCLIC SORT
    //Source-https://leetcode.com/problems/missing-number/description/

      //Approach-1 Summition TC: O(n) SC: O(1)
      public int missingNumber1(int[] nums) {
          int sum=0;
          int check=(nums.length)*(nums.length+1)/2;
          for(int i:nums)
              sum+=i;
          return check-sum;
      }

  
      //Approach-2-Cyclic Sorting TC: O(n) SC: O(1)
      public int missingNumber(int[] arr) {
        int i=0;
        while(i< arr.length){
            int rIndex =arr[i];
            if(i==rIndex || arr[i]==arr.length)
                i++;
            else{
                int temp = arr[i];
                arr[i] = arr[rIndex];
                arr[rIndex] = temp;
            }
        }
        
        int j=0;
        for(; j<arr.length; j++){
          if(j!=arr[j])
            break;   
        }
        return j;
      }
      /* A8: CYCLIC SORT- TC: O(n) SC: O(1)
          - arr[rIndex] -> Is the number who is supposed to swap with arr[i].
          - arr[i] -> Is the number who may not supposed to be there while traversing.
          - rIndex = arr[i] -> (0,n); rIndex =  arr[i]-1 -> (1,n); rIndex =  arr[i]-k -> (k,n);
          - Swapping Condition -> i != rIndex
          - Skipping Condition -> i == rIndex
          - Swapping Elements -> arr[i] and arr[rIndex] */

      /* T20: MISSING NUMBER/CONDITIONAL CYCLIC SORT- There is number missing in the array. And a number
         which should to be not present in the array is there == array.length. So if we simply use cyclic 
         sort arranging rest of the numbers on their correct indices. And lastly this extra number will
         be present on the index of the missing number. */
    

  
  
    //QUESTION-43 Sort Array By Parity-I
    //Source-https://leetcode.com/problems/sort-array-by-parity/description/
    
      public int[] sortArrayByParity(int[] nums) { 
          int evenPos=0;
          for(int i=0; i<nums.length; i++){
              if(nums[i]%2==0){
                  int temp=nums[i];
                  nums[i]=nums[evenPos];
                  nums[evenPos]=temp;
                  evenPos++;
              }
          }    
          return nums;
      }



  
    //QUESTION-44 Sort Array By Parity-II
    //Source-https://leetcode.com/problems/sort-array-by-parity-ii/description/

        public int[] sortArrayByParityII(int[] nums) {
            int[]ans= new int[nums.length];
            int even=0;
            int odd=1;
            for(int i=0;i<nums.length;i++){
                if(nums[i]%2==0){
                    ans[even]=nums[i];
                    even=even+2;
                }else{
                    ans[odd]=nums[i];
                    odd=odd+2;
                }
            }
            return ans;
        }


  
  
    //QUESTION-45  Largest Perimeter Triangle
    //Source-https://leetcode.com/problems/largest-perimeter-triangle/description/
  
      public int largestPerimeter(int[] nums) {
          int n = nums.length;
          Arrays.sort(nums);
          for (int k = n - 1; k >= 2; k--) {
              int c = nums[k];
              int b = nums[k - 1];
              int a = nums[k - 2];

              if (this.isValid(a, b, c)) {
                  return a + b + c;
              }
          }

          return 0;
      }

      private boolean isValid(int a, int b, int c) {
          return a + b > c;
      }
      //Refer Sliding Window Algorithms(Constant). Last Window-> Index=0,1,2(k>=2)

  
  
  
    //QUESTION-46 Squares of a Sorted Array
    //Source-https://leetcode.com/problems/squares-of-a-sorted-array/description/
  
      public int[] sortedSquares(int[] nums) {
          int[] arr = new int[nums.length];
          int i=0, j= nums.length-1;
          for(int k = nums.length-1; k>=0; k--){
              if(Math.abs(nums[j])>=Math.abs(nums[i])){
                  arr[k] = nums[j] *  nums[j];
                  j--;
              }
              else{
                  arr[k] = nums[i] * nums[i] ;
                  i++;
              }
          }
          return (arr);
      }
      /* A9: E-COMPARISON- Take two pointer one at start and one at end of the array. And move till 
         i<j || i<=j. Such algorithms are used in Valley Arrays Series or Mountain Array Series. */ 



  
    //QUESTION-47- Maximum Product of Two Elements in an Array
    //Source-https://leetcode.com/problems/maximum-product-of-two-elements-in-an-array/description/

      public int maxProduct(int[] arr) {
          int max=0,secMax=0;
          for(int i=0; i< arr.length; i++){
              if(arr[i]>max) {
                  secMax = max;
                  max = arr[i];
              }
              else if(secMax<arr[i]){
              secMax = arr[i];
          }
      }
          return ((max-1) * (secMax-1));
      }


  
  
    //QUESTION-48 Two Sum (REPEATED)



  
    //QUESTION-49 Relative Sort Array
    //Source-https://leetcode.com/problems/relative-sort-array/description/
  
      public int[] relativeSortArray(int[] arr1, int[] arr2) {
        
          int[] bucket = new int[1001];

          int[] result = new int[arr1.length];
          int index = 0;

          
          for(int i : arr1) {
              bucket[i]++;
          }

          
          for(int i : arr2) {
              while(bucket[i]-- > 0) {
                  result[index++] = i;
              }
          }
          
          for(int i = 0; i < 1001; i++){
              if(bucket[i] > 0) {
                  while(bucket[i]-- > 0) {
                      result[index++] = i;
                  }
              }
          }
          return result;
      }
      //Refer Bucket Algorithm Tool.



  
    //QUESTION-50 Make Two Arrays Equal by Reversing Sub-arrays(DISCARDED)

  


    //QUESTION-51 Array Partition I(DISCARDED)


  
  
    //QUESTION-52 Height Checker
    //Source-https://leetcode.com/problems/height-checker/description/
  
      public int heightChecker(int[] heights) {
          int[] map = new int[101]; 
          for (int i = 0; i < heights.length; i++) {
              map[heights[i]]++; 
          }
          int count = 0;
          int j = 0;
          for (int height = 0; height < map.length && j < heights.length; height++) {
              if (map[height] != 0) {
                  for (int k = 0; k < map[height] ; k++) {
                      if (heights[j] != height) {
                          count++;
                      }
                      j++;
                  }
              }
          }
          return count;
      }
      // Refer Bucket Alogrithm Tool.
  
      /* Approach-2- Create Bucket, Create Bucket Sum, Traverse on the Main Array. 
         Check if the i ∈ [bucketSum[arr[i-1]], bucketSum[arr[i]]-1], if yes then count++ */
    


  
    //QUESTION-53 Average Salary Excluding the Minimum and Maximum Salary
    //Source-https://leetcode.com/problems/average-salary-excluding-the-minimum-and-maximum-salary/
  
      public double average(int[] salary) {
          double total=0;
          int max=Integer.MIN_VALUE;
          int min=Integer.MAX_VALUE;
          for(int i:salary){
              if(i>max) {
                  max=i;
              }
              if(i<min) {
                  min=i;
              }
          }
          for(int i:salary) {
              if(i!=max && i!=min) {
                  total= total+i;
              }
          }
          return total/(salary.length-2);
      }


  
  
    //QUESTION-54 Can Make Arithmetic Progression From Sequence
    //Source-https://leetcode.com/problems/can-make-arithmetic-progression-from-sequence
  
      public boolean canMakeArithmeticProgression(int[] arr) {
         int minVal = 100000000;
          int maxVal = -1000000000;
          for (int num : arr){
              if (num < minVal) {
                  minVal = num;
              }
              if (num > maxVal) {
                  maxVal = num;
              }
          }

          int n = arr.length;
          int absDiff = maxVal - minVal;

          if (absDiff == 0) 
            return true;
          if (absDiff % (n-1) != 0) 
            return false;

          int diff = absDiff / (n-1);

          Set<Integer> numberSet = new HashSet<>();

          for (int num : arr) {
              if ((num - minVal) % diff != 0) {
                  return false;
              }
              numberSet.add(num);
          }
          return numberSet.size() == n; 
      }
      //Refer Sequence and Series(Eleventh Standard). 




  
    //QUESTION-55 Sort Array by Increasing Frequency(R)


  
  
    //QUESTION-56 Find All Numbers Disappeared in an Array
    //Source-https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array

      //Approach-1- Index Accesing TC: O(n) SC: O(n)
      public List<Integer> findDisappearedNumbers1(int[] nums) {
          int[] arr = new int[nums.length+1];
          List<Integer> list = new ArrayList<Integer>();

          for(int i = 0; i< nums.length; i++){
              arr[nums[i]] =1;
          }

          for(int i =1; i<arr.length ; i++){
              if(arr[i] == 0){
                  list.add(i);
              }
          }
       return list;
      }
      /* T21: INDEX ACCESSING+FLAGING- Accessed Index, while traversing the array. Mark 1 those travesred as 1.
         Checked the Bucket whose value=0. */

  
      //Approach-2- Cyclic Sort TC: O(n) SC: O(1)
      public List<Integer> findDisappearedNumbers2(int[] arr) {
          int i=0;
          while(i< arr.length){
              int rIndex =arr[i]-1;
              if(i==rIndex || arr[i] == arr[rIndex])
                  i++;
              else{
                  int temp = arr[i];
                  arr[i] = arr[rIndex];
                  arr[rIndex] = temp;
              }
          }
          List<Integer> list = new ArrayList<Integer>();
          int j=0, k=1;
          while(j< arr.length){
              if(arr[j] != k){
                  list.add(k);
              }
              j++;
              k++;
          }
          return list;
      }
      // Refer Cyclic Sort. Additional Skipping Condition -> arr[i] == ar[rIndex].

  

  
  
    //QUESTION-57 Set Mismatch
    //Source-https://leetcode.com/problems/set-mismatch/description/
  
      public int[] findErrorNums(int[] arr) {
          int i=0;
            while(i< arr.length){
                int rIndex =arr[i]-1;
                if(i==rIndex || arr[i] == arr[rIndex])
                    i++;
                else{
                    int temp = arr[i];
                    arr[i] = arr[rIndex];
                    arr[rIndex] = temp;
                }
            }
            int[] list = new int[2];

            int j=0, k=1;
            while(j< arr.length){
                if(arr[j] != k){
                    list[0] = arr[j];
                    list[1] = k;
                }
                j++;
                k++;
            }
            return list;
      }
      //Refer Cyclic Sort. Additional Skipping Condition -> arr[i] == ar[rIndex].


  

    //QUESTION-58 Assign Cookies
    //Source-https://leetcode.com/problems/assign-cookies/description/
  
      public int findContentChildren(int[] g, int[] s) {
          Arrays.sort(g);  Arrays.sort(s);
          int i=0, j=0,child=0;
          while(j< s.length && i< g.length){
              if(s[j]>=g[i]){
                  child++;
                  i++;
              }
                  j++;
          }
          return (child);

      }
      //Refer Begin 23' Algorithm.

  

  
    //QUESTION-59 Merge Sorted Array
    //Source-https://leetcode.com/problems/merge-sorted-array/description/
  
      public void merge(int[] nums1, int m, int[] nums2, int n) {
          int i = m - 1;
          int j = n - 1;
          int k = m + n - 1;

          while (j >= 0) {
              if (i >= 0 && nums1[i] > nums2[j]) {
                  nums1[k] = nums1[i];
                  k--; i--;
              } else {
                  nums1[k] = nums2[j];
                  k--; j--;
              }
          }
      }



  
    //QUESTION-60 Sort Array by Increasing Frequency
    //Sourc-https://leetcode.com/problems/sort-array-by-increasing-frequency/description/

      public int[] frequencySort(int[] nums) {
          int[] array = new int[201];

          for(int num : nums){
              array[num + 100]++;
          }

          for(int i=nums.length-1;i>=0;){
              int max = 0,ind = -1;
              for(int j=0;j<201;j++){
                  if(array[j] > max){
                      max = array[j];
                      ind = j;
                  }
              }

              for(int j=0;j<max;j++){
                  nums[i] = ind - 100;
                  i--;
              }

              array[ind] = 0;
          }
          return nums;
      }

  

  
    //QUESTION-61 Majority Element
    //Source-https://leetcode.com/problems/majority-element/description/

      //METHOD-1
      public int majorityElement1(int[] nums) {
          Arrays.sort(nums);
          return nums[nums.length/2];
      }

      //METHOD-2
      public int majorityElement2(int[] nums) {
          int majValue = 0, count=1;
          for(int i=1; i<nums.length; i++){
              if(nums[i]== nums[majValue]){
                  count++;
              }
              else{
                  count--;
              }
              if(count==0){
                  majValue= i;
                  count =1;
              }
          }
          int c=0;
          for(int i=0; i< nums.length; i++){
              if(nums[majValue]==nums[i]){
                  c++;
              }
          }
          if(c> nums.length/2){
              return (nums[majValue]);
          }
          return -1;
      }




    //QUESTION-62 Richest Customer Wealth
    //Source-https://leetcode.com/problems/richest-customer-wealth/description/
  
      public int maximumWealth(int[][] accounts) {
        int max = 0;
         for(int i=0; i<accounts.length; i++) {
             int sum =0;
             for (int j = 0; j < accounts[i].length; j++) {
                 sum = sum + accounts[i][j];
             }
             max = Math.max(max, sum);
         }
        return max;
      }
      //Refer Parallel Maximum Analyser.



  
    //QUESTION-63 Sort Integers by The Number of 1 Bits(REPEATED)
    //Source-https://leetcode.com/problems/sort-integers-by-the-number-of-1-bits/description/
    
    


  
    //QUESTION-64 Minimum Absolute Difference
    //Soure-https://leetcode.com/problems/minimum-absolute-difference/description/

      static public List<List<Integer>> minimumAbsDifference(int[] arr) {
          List<List<Integer>> list = new ArrayList<>();
          int diff=0;
          int min =  Integer. MAX_VALUE;
          Arrays.sort(arr);
          for(int i=1; i< arr.length; i++){
              diff = arr[i]- arr[i-1];
              if(diff<min){
                  min = diff;
              }
          }

          for(int i=1; i<arr.length;i++) {
              if (arr[i] - arr[i - 1] == min) {
                  List<Integer> ans = new ArrayList<>();
                  ans.add(arr[i - 1]);
                  ans.add(arr[i]);
                  list.add(ans);
              }
          }
          return list;
      }
      //Refer P-Comparison.



  
    //QUESTION-65 Rank Transform of an Array
    //Source-https://leetcode.com/problems/rank-transform-of-an-array/description/




    //QUESTION-66 Make Two Arrays Equal by Reversing Sub-arrays(DISCARDED)




    //QUESTION-67 Flipping an Image
    //Source-https://leetcode.com/problems/flipping-an-image/description/

      static public int[][] flipAndInvertImage(int[][] image) {
          for(int i=0; i<image.length; i++){
            int s =0;
            int e = image.length-1;
            while(s<e){
                int temp = image[i][s];
                image[i][s] = image[i][e];
                image[i][e] = temp;
                s++;
                e--;
            }
          }

          for (int i = 0; i < image.length ; i++) {
              for (int j = 0; j < image.length; j++) {
                  if(image[i][j]==0){
                      image[i][j]=1;
                  }
                  else{
                      image[i][j]=0;
                  }
              }
          }
          return image;
      }
      //Refer-E-Comparison- == sign in while loop does't matter, if we put or not.




    //QUESTION-68 Matrix Diagonal Sum
    //Source-https://leetcode.com/problems/matrix-diagonal-sum/description/

      public int diagonalSum(int[][] mat) {
          int res = 0;
          int n = mat.length;
          for (int i=0; i<n; i++) {
              res += mat[i][i];
              res += mat[n-1-i][i];
          }
          return n % 2 == 0 ? res : res - mat[n/2][n/2];
      }
      //T22: DIAGONAL GEN- Diagonal Generalised Formulae a[i][i] and a[n-i-1][i]




    //QUESTION-69 Transpose Matrix
    //Source-https://leetcode.com/problems/transpose-matrix/description/

      static public int[][] transpose(int[][] arr) {
          int n = arr.length;
          int m = arr[0].length;

          int ans[][] = new int[m][n];
          for(int i=0; i<n; i++){
              for(int j=0; j<m; j++){
                 ans[j][i] = arr[i][j];
              }
          }
          return ans;
      }
    
    
    
    
    //QUESTION-70 Reshape the Matrix
    //Source-https://leetcode.com/problems/reshape-the-matrix/description/
      public int[][] matrixReshape(int[][] mat, int r, int c) {
          int row = mat.length;
          int col = mat[0].length;

          if((row * col) != (r * c)) return mat;

          int[][] arr = new int[r][c];
          int rowNum = 0;
          int colNum = 0;

          for(int i=0; i<row; i++){
              for(int j=0; j<col; j++){
                  arr[rowNum][colNum] = mat[i][j];
                  colNum++;
                  if(colNum == c){
                      colNum = 0;
                      rowNum++;
                  }
              }
          }
          return arr;
      }
      /* T23: RESHAPING MATRIX- We have to two extra pointers for the New Matrix. Iterate
         normally on Old Matrix. Fill the Columns of theNew Matrix, once c==colNum, change row and colNum = 0. */




    //QUESTION-71 Determine Whether Matrix Can Be Obtained By Rotation
    //Source-https://leetcode.com/problems/determine-whether-matrix-can-be-obtained-by-rotation/description/

      public boolean findRotation(int[][] mat, int[][] target) {
          int count90 = 0, count180 = 0, count270 = 0, count360 = 0;
          int n = mat.length;

          for(int i = 0; i < n; i++){
              for(int j = 0; j < n; j++){
                  if(mat[i][j] == target[n - j - 1][i]) count90++;
                  if(mat[i][j] == target[n - i - 1][n - j - 1]) count180++;
                  if(mat[i][j] == target[j][n - i - 1]) count270++;
                  if(mat[i][j] == target[i][j]) count360++;
              }
          }

          if((count90 == n * n) || (count180 == n * n) || (count270 == n * n) || (count360 == n * n)) return true;
          else return false;
      }




    //QUESTION-72 Maximum Population Year
    //Source-https://leetcode.com/problems/maximum-population-year/description/




    //QUESTION-73 Matrix Cells in Distance Order
    //Source-https://leetcode.com/problems/matrix-cells-in-distance-order/description/




    //QUESTION-74 Count Negative Numbers in a Sorted Matrix
    //Source-https://leetcode.com/problems/count-negative-numbers-in-a-sorted-matrix/description/

      public int countNegatives(int[][] grid) {
          int rows = grid.length;
          int columns= grid[0].length;
          int c=0;
          int i=0;
          int j=columns-1;
          while(i<rows){
              if(j>=0 && grid[i][j]<0){
                  c++;
                  j--;
              }
              else{
                  i++;
                  j=columns-1;
              }
          }
          return (c);
    }
    //T24: Traversing in Matrix using one Loop. TC- O(m*n)




    //QUESTION-75 Lucky Numbers in a Matrix
    //Source-https://leetcode.com/problems/lucky-numbers-in-a-matrix/description/

      public List<Integer> luckyNumbers (int[][] matrix) {
          int n = matrix.length;
          int m = matrix[0].length;
          ArrayList<Integer> ls = new ArrayList<Integer>();

          for (int i=0; i<n; i++){
              int num = Integer.MAX_VALUE;
              int index = -1;
              for (int j=0; j<m; j++){
                  if(matrix[i][j] < num){
                      num = matrix[i][j];
                      index = j;
                  }
              }
              boolean flag = true;
              for(int row=0; row<n; row++){
                  if(matrix[row][index] > num ) flag = false;
              }
              if(flag) ls.add(num);
          }
          return ls;
      }
      //T25: VERTICAL TRAVERSING IN THE MATRIX.




  //EXERCISE-3(28)

    //QUESTION-1 Product of Array Except Self
    //Source-https://leetcode.com/problems/product-of-array-except-self/
    //Constrains- TC-O(n) && SC- O(1) && No Division
  
      public int[] productExceptSelf(int[] nums) {
        int numsLength = nums.length;
        int prefixProduct = 1;
        int suffixProduct = 1;

        int[] result = new int[numsLength];

        for(int i = 0; i < numsLength; i++) {
          result[i] = prefixProduct;
          prefixProduct = prefixProduct * nums[i];
        }

        for(int i = numsLength-1; i >= 0; i--) {
          result[i] =  result[i] * suffixProduct;
          suffixProduct = suffixProduct * nums[i];
        }
        return result;
      }
      // Refer PUSH VALUE ALGORITHM-II we can solve this question O(nsq) TC, O(1) SC.
      /* T1: PREFIX SUM II- Normally we write the sum/product till the index, but here
         we write the product/sum till index-1. For index 0 predecide the value. Access
         the value and then update the sum/product. */




    //QUESTION-2  Rotate Array
    //Source-https://leetcode.com/problems/rotate-array/description/

      //Approach-1 TC-O(n) && SC-O(n)
      public int[] rotatedArray1(int[] arr) {
        int k =3;
        int size = arr.length;
        int j =0, i= k;
        int[] res = new int[arr.length];
        while(i< size+k){
            int t = i % size;
            res[t] = arr[j];
            j++;
            i++;
        }
        return res;
      }


      //Approach-2  TC-O(n) && SC-O(1)
      public static void reverse(int[] arr, int start, int end){
        while(start<end){
          int temp =arr[start];
          arr[start] = arr[end];
          arr[end] = temp;
          start++;
          end--;
        }
      }

      public int[] rotatedArray2(int[] arr) {
        reverse(arr, 0, arr.length-1);
        reverse(arr, 0, k-1);
        reverse(arr, k, arr.length-1);
        return arr;
      }
    /* T2: ROTATE A DS- Whenever we get rotated array question divide the array into the two segmenst.
       Check all the possibilities regarding that. Using Reverse Functions, Reverse Complete-> Reverse
       the First Part-> reverse the Second Part. */
    // T3: ROTATE A DS- Cyclic DS may use modulo operator to get back to the first index.

  

    //QUESTION-3- SORT COLORS
    //Source-https://leetcode.com/problems/sort-colors/
    //Constraints- TC-O(n) && SC-O(1) && Inplace.

      //Approach-1 TC-O(n) SC-O(1)
      public int[] sortColors1(int[] arr) {
        int count0 = 0, count1 =0, count2 =0;
        for(int i=0; i< arr.length; i++){
          if(arr[i]==0) count0++;
          else if (arr[i]==1) count1++;
          else count2++;
        }

        int j =0;
        while(j< arr.length){
          if(count0> 0){
            arr[j] = 0; j++; count0--;
          }
          else if(count1>0){
            arr[j] = 1; j++; count1--;
          }
          else{
            arr[j] = 2; j++; count2--;
          }
        }
        return arr;
      }
      /* A1: BUCKET ALGORITHM(VARIABLE STORAGE)- Variable Storage can be use when we constant
         variety of different elements in an array. */


      //Aproach-2 Dutch National Flag Algorithm TC-O(n) SC-O(1)
      public void sortColors(int[] nums) {
          int low = 0;
          int mid =0;
          int high = nums.length-1;

          while(high >= mid){
              if(nums[mid] == 2){
                  swap(nums, mid, high);
                  high--;
              }
              else if(nums[mid] == 1){
                  mid++;
              }
              else{
                  swap1(nums, mid, low);
                  mid++;
                  low++;
              }
          }
      }

      private void swap1(int[] nums, int i, int j){
          int temp = nums[i];
          nums[i] = nums[j];
          nums[j] = temp;
      }
      /* A2: DUTCH NATIONAL FLAG ALGORITHM- Check value of arr[mid] -
          - if 0, swap arr|low] and arrimidl, low++, mid++
          - if 1, mid++
          - if 2, swap arr|mid] and arr[high], high-- */



  
    //QUESTION-4 Find First and Last Position of Element in Sorted Array
    //Source-https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/description/

      public int[] searchRange(int[] nums, int target) {

          int[] result = new int[2];
          result[0] = searchFirst(nums, target);
          result[1] = searchLast(nums, target);

          return result;
      }


      private int searchFirst(int[] nums, int target){
          int left = 0;
          int right = nums.length - 1;
          int index = -1;

          while(left <= right){

              int mid = left + (right - left) / 2;

              if(nums[mid] == target){
                  index = mid;
                  right = mid - 1;
              }

              else if(nums[mid] < target){
                  left = mid + 1;
              }
              else{
                  right = mid - 1;
              }
          }
          return index;
      }


      private int searchLast(int[] nums, int target){
          int left = 0;
          int right = nums.length - 1;
          int index = -1;

          while(left <= right){

              int mid = left + (right - left) / 2;

              if(nums[mid] == target){
                  index = mid;
                  left = mid + 1;
              }

              else if(nums[mid] < target){
                  left = mid + 1;
              }
              else{
                  right = mid - 1;
              }
          }

          return index;
      }
      /* T3: SKIPPING INSIDE ANSWER- Inside answer block we skip when we get the target with
        end = mid -1/start = mid +1. Doing this results being mid on the First/Last Target
        Number in the Array. After that condition fails. */




    //QUESTION-5 Find the Duplicate Number
    //Source-https://leetcode.com/problems/find-the-duplicate-number/
  
      //Approach-1 TC-O(n) && SC-O(n)
      public static int findDuplicate1(int[] nums) {
          Set<Integer> set = new HashSet<>();
          int len = nums.length;
          for (int i = 0; i < len; i++) {
              if (!set.add(nums[i])) {
                  return nums[i];
              }
          }
          return len;
      }

  
      //Approach-2 TC-O(n) && SC-O(1)
      public static int findDuplicate2(int[] nums) {
        for (int i = 0; i < nums.length; i++) {
            int element = Math.abs(nums[i]);
            int rIndex = element - 1;
            if(nums[rIndex]>0){
                nums[rIndex] = -nums[rIndex];
            }
            else{
                return rIndex + 1;
            }
        }
        return nums.length;
      }
      //Note: This approach will fail when there are more than 1 duplicate numbers.
      //Refer Flagging Syria Algorithm.
  

      //Approach-3 TC-O(n) && SC-O(1) && No Array Manipulation
      public static int findDuplicate3(int[] nums) {
        int slow = 0; //TP: We took 0 as a start point as there was no 0 in the array.
        int fast =0;
        do{
          slow = nums[slow];
          fast = nums[nums[fast]];
        }while(slow!=fast);
        
        slow =0;
        while(slow!=fast){
          slow = nums[slow];
          fast = nums[fast];
        }
        return (slow);
      }
      /* A3: SLOW AND FAST POINTER- Take the array [1,3,4,2] as an example, the index
         of this array is [0,1,2,3], we can map the index to the nums[n].
         Ex: 0→1→3→2→4→3→2. Start from nums[n] as a new index, and so on, until the index
         exceeds the bounds. This produces a sequence similar to a linked list.
         0→1→3→2→4→null. If there are a repeated numbers in the array, take the array
         [1,3,4,2,2] as an example, 0→1→3→2→4→3→2→4→2.
         Step-1: Create the Imaginary LL before writing a single line of code.
         Step-2: Use Slow and Fast Algorithm. */



  
    //QUESTION-6 Find Peak Element
    //Source-https://leetcode.com/problems/find-peak-element/description/

      public int findPeakElement(int[] arr){
          int start = 1;
          int end = arr.length - 2;


        //Single Element
        if (arr.length == 1){
            return 0;
        }

        //Complete Descending
        if (arr[0] > arr[1]) {
            return 0;
        }

        //Complete Ascending
        if (nums[arr.length - 1] > nums[arr.length - 2]){
            return n - 1;
        }

        while(start <= end){
            int mid = start + (end - start) / 2;

            //Answer Part
            if(arr[mid] > arr[mid - 1] && arr[mid] > arr[mid + 1]){
                return mid;
            }

            //Ascending Part
            else if(arr[mid] > arr[mid - 1]){
                start = mid +1;
            }

            //Descending Part
            else {
                end = mid - 1;
            }
        }
      }
      /* T4: MOUNTAIN PEAK- Resolve Edge Cases and Use BS.
         Step-1: Resolve all the Edge Cases that 1)Single Element 2) Comple Descending 3)
         Complete Ascending.
         Step-2: As we have already resolved the edge cases we can use m + 1 and m - 1.
         Now we  can use s = 1, e = arr.length - 2. And then use Binary Search. */




    //QUESTION-7 4Sum(A)
    //QUESTION-8- Find First and Last Position of Element in Sorted Array(R)
    //QUESTION-9  Find the Duplicate Number(R)




    //QUESTION-10  Single Element in a Sorted Array
    //Source-https://leetcode.com/problems/single-element-in-a-sorted-array/description/

      public int singleNonDuplicate(int[] arr) {
          //Step-1: Define Size
          int size = arr.length;

          //Step-2: s and e are Normally Defined
          int start = 0, end = size-1;

          //Step-3: Tackle the Single Element Array TC
          if(arr.length == 1){
              return arr[0];
          }


          while(start <= end){
              int mid = start + (end - start) / 2;

              //Step-4: Define RSS
              int remainingSearchSpace = size / 2;

              //Answer for Edge Cases
              if(mid == arr.length-1 && arr[mid] != arr[mid-1] ){
                  return arr[mid];
              }

              else if(mid == 0 && arr[mid] != arr[mid+1]){
                  return  arr[mid];
              }

              //Answer for Normal Cases
              else if(arr[mid] != arr[mid - 1] && arr[mid] != arr[mid + 1]){
                  return arr[mid];
              }

              //Even Remaining Search Space
              else if(remainingSearchSpace % 2 == 0){
                  if(arr[mid] == arr[mid-1]){
                      end = mid - 2;
                  }
                  else {
                      start = mid + 2;
                  }
                  size = remainingSearchSpace - 1;
              }

              //Odd Remaining Search Space
              else{
                  if(arr[mid] == arr[mid-1]){
                      start = mid + 1;
                  }
                  else {
                      end = mid - 1;
                  }
                  size = remainingSearchSpace;
              }
          }
          return -1;
      }
      /* T5: SINGLE ELEMENT(SORTED)- We use the neigbour element of mid keeping the
          remaining size in mind to evaluate where to go.
          Step-1: We know we have Odd Sized Array. We have 2 types of Odd Array- 3'Odd
          and 5'Odd. Now when we divide the size in half we get either Even Remaining
          Space or Odd Remaining Space.
          Step-2: If we got Odd RSS use size = rSS otherwise use size = rSS-1. */





    //QUESTION-11- Same Colors(R)




    //QUESTION-12  Search in Rotated Sorted Array[*]
    //Source-https://leetcode.com/problems/search-in-rotated-sorted-array/description/

      public int search2(int[] nums, int target) {
        int start = 0, end = nums.length - 1;

        while (start <= end) {
            int mid = (start + end) / 2;

            //Answer
            if (nums[mid] == target) {
                return mid;
            }

            //TC-Mid in Left of Pivot, Left Part WRT Mid is Sorted
            /* TC- During First Iteration, if Target lies in the Sorted Reigion, then we don't
               need the else block. */

            if (nums[start] <= nums[mid]) {
                if (nums[start] <= target && target < nums[mid]) {
                    end = mid - 1;
                }
                else {
                    start = mid + 1;
                }
            }

            //TC-Mid in Right of Pivot, Right Part WRT Mid is Sorted
            else {
                //TC- If Right Side WRT Mid is Sorted then we can check in the Right for Target.
                if (nums[mid] < target && target <= nums[end]) {
                    start = mid + 1;
                }
                else {
                    end = mid - 1;
                }
            }
        }
        return -1;
      }
      /* T6: PIVOT SEARCHING- Here for searching the target we have to ensure in which
         search sapce our MID and TARGET is lying. There can be situtaion where Mid and Target both
         are in different Search Spaces.
         Step-1: Where is our Mid WRT Pivot- If Pivot is in Right then it means Left is Sorted.
         Step-2: Where is our target WRT to Mid. */



  
    //QUESTION-13 Search in Rotated Sorted Array II
    //Source-https://leetcode.com/problems/search-in-rotated-sorted-array-ii/description/
  
      public boolean search3(int[] nums, int target) {
        int start = 0, end = nums.length - 1;

        while (start <= end) {
          int mid = start +  (end - start) / 2;
          if (nums[mid] == target) {
              return true;
          }

          if (nums[start] == nums[mid]) {
            start++;
            continue;
          }

          if (nums[start] <= nums[mid]) {
            if (nums[start] <= target && target <= nums[mid]) {
                end = mid - 1;
            }
            else {
                start = mid + 1;
            }
          } 
          else {
            if (nums[mid] <= target && target <= nums[end]) {
                start = mid + 1;
            }
            else {
                end = mid - 1;
            }
          }
        }  
        return false;
      }



  
    //QUESTION-14 Find Minimum in Rotated Sorted Array
    //Source-https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/description/
  
      public int findMin(int[] nums) {
        int min = Integer.MAX_VALUE;
        int start =0, end = nums.length-1;

        while(start<=end){
          int mid = start +(end - start)/2;

          if(nums[mid]<=nums[end]){
             end = mid-1;
          }

          else{
            start = mid +1;
          }

          min = (nums[mid]<min)? nums[mid]:min;
        }

        return (min); 
      }
      /* T7: SKIPPING PIVOT- We don't write a if block when the pivot is found, instead
         when pivot is found we pretend that the pivot is in left/right. When the pivot
         is traversed it update it with the most minimun value. After traversing pivot
         as mid pointer, we will start traversing left(depending upon which side we are
         comparing to decide the pivot position) of pivot till the loop condition
         becomes false.

         If pivot is traversed with mid pointer at the last traversal then e will be pivot-1,
         start and mid will remain on pivot. */



  
    //QUESTION-15-Find all Duplicates in an Array
    //Source-https://leetcode.com/problems/find-all-duplicates-in-an-array/description/

      //Approach-1 Cyclic Sort: TC-O(n) && SC-O(1)
      public List<Integer> findDuplicates1(int[] nums) {
          int i = 0;
          while (i < nums.length) {
              int rIndex = nums[i] - 1;
              if (i == rIndex || nums[i] == nums[rIndex]) {
                 i++;
              }
              else {
                  swap(nums, i, rIndex);
              }
          }

          List<Integer> list = new ArrayList<>();
          for (int j = 0; j < nums.length; j++) {
              if (nums[j] != j + 1) {
                  list.add(nums[j]);
              }
          }
          return list;
      }

      private static void swap(int[] arr, int first, int second) {
          int temp = arr[first];
          arr[first] = arr[second];
          arr[second] = temp;
      }


      //Approach-2 TC-O(n) && SC-O(1)
      public List<Integer> findDuplicates2(int[] nums) {
          List<Integer> result = new ArrayList<>();

          for(int i = 0; i < nums.length; i++) {
              int element = Math.abs(nums[i]);
              int rIndex = element - 1;

              if(nums[rIndex] < 0)
                  result.add(element);
              else
                  nums[rIndex] *= -1;
          }

          return result;
      }
      //Note- If the duplicate numbers are more than twice this approach will fail.
      /* T8: FLAGGING SYRIA- Here we are doing two things: Traversing every Element through
         index one by one[0-N], through that we are also traversing the Number at rIndex.
         Ex: [4,3,1,2] Index = 0, Element = 4, rIndex = 3, Number At rIndex = 2. Hence
         we are traversing every number in the array through rIndex ONLY ONCE. But if have
         some missing numbers in [1, n] and duplicates. Ex: [4, 3, 2, 7, 8, 2, 3, 1]. Here we
         will be traversing every index. But we can't traverse every rIndex, like here we can't
         traverse rIndex = 4, rIndex = 5. But here we will traverse rIndex = 1 and rIndex = 2
         twice. */


  
    //QUESTION-16-Insertion Sort List(A)

  
    //QUESTION-17- Minimum Absolute Sum Difference
    //Source-https://leetcode.com/problems/minimum-absolute-sum-difference/

      public int minAbsoluteSumDiff(int[] nums1, int[] nums2) {
        int[] temp = nums1.clone();
        Arrays.sort(temp);
        int n = nums1.length;
        long sum = 0;
  
        for(int i = 0; i < n; i++){
            sum = sum + Math.abs(nums1[i] - nums2[i]);
        }
  
        int mod=(int)1e9+7;
        long ans = sum;

        for(int i = 0; i < n; i++){
            int justBigger = justGreater(temp, n, nums2[i]);
            long originalDifference = Math.abs(nums1[i] - nums2[i]);
            long tempSum1 = sum - originalDifference;
            tempSum1 = tempSum1 + Math.abs(temp[justBigger] - nums2[i]);
            ans = Math.min(ans, tempSum1);
  
            if(justBigger != 0){
                long tempSum2 = sum - originalDifference;
                tempSum2 = tempSum2 + Math.abs(temp[justBigger - 1] - nums2[i]);
                ans = Math.min(ans, tempSum2);
            }
        }
        return (int)(ans%mod);
      }


      private int justGreater(int[] arr, int n, int k){
          int start = 0, end = n - 1;
          int ans = end;

          while(start <= end){
             int mid = start + (end - start) / 2;

             if(arr[mid] >= k){
                 ans = mid;
                 end = mid - 1;
             }

             else
                 start = mid + 1;
          }
          return ans;
      }
      /* T9: MIN DIFFERENCE- Check the number just bigger and smaller than target in the nums2.
         Just smaller will be element just before the justBigger element in the sorted array.
         Compare the Original Difference, Element(nums2) - JustBigger(nums1) and
         Element(nums2) - JustSmaller(nums1). The most minimum difference is answer. */




    //QUESTION-18- Sort List(A)
    //QUESTION-19- Largest Number(A)




    //QUESTION-20- Reach a Number
    //Source-https://leetcode.com/problems/reach-a-number/

      public int reachNumber(int target) {
          int sum =0 ,steps = 0;
          if(target ==0) return 0;
          target = Math.abs(target);
          while(sum< target){
              sum+=steps;
              steps++;
          }
  
          while(((sum-target)%2!=0)){
              sum+=steps;
              steps++;
          }
          return steps-1;
      }
      /* TC- target-4: 0+1+2+3, we see here sum=6 sum-target=2, if I want to create difference of 2
      then where we written +1 there we have to write -1 then we got the answer.
      
      TC- target-11: 0+1+2+3+4+5, we see here sum=15 sum-target=4, if I want to create difference of 4
      then where we written +2 there we have to write -2 then we got the answer. */




    //QUESTION-21 Capacity To Ship Packages Within D Days
    //Source-https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/

      public int shipWithinDays(int[] weights, int days) {
          int maxWeight = -1, totalWeight = 0;
          for (int weight : weights) {
              maxWeight = Math.max(maxWeight, weight);
              totalWeight += weight;
          }
          int left = maxWeight, right = totalWeight;
          while (left < right) {
              int mid = (left + right) / 2;
              int daysNeeded = 1, currWeight = 0;
              for (int weight : weights) {
                  if (currWeight + weight > mid) {
                      daysNeeded++;
                      currWeight = 0;
                  }
                  currWeight += weight;
              }
              if (daysNeeded > days) {
                  left = mid + 1;
              } else {
                  right = mid;
              }
          }
          return left;
      }




    //QUESTION-22 Koko Eating Bananas
    //Source-https://leetcode.com/problems/koko-eating-bananas/

      //Approach-1 O(n * m)
      public int minEatingSpeed1(int[] nums, int h) {
          int max = maximum(nums, Integer.MIN_VALUE);

          for(int i = 1; i <= max; i++){
              long hoursToEat = hours(nums, i);

              if(hoursToEat <= h){
                    return i;
              }
          }
          return -1;
      }

      private long hours(int[] nums, int speed){
          long hours = 0;
          for(int i = 0; i < nums.length; i++){
              hours += nums[i] / speed;

              if(nums[i] % speed != 0){
                  hours += 1;
              }
          }
          return hours;
      }

      private int maximum(int[] nums, int max){
          for(int i = 0; i < nums.length; i++){
              if(nums[i] > max){
                  max = nums[i];
              }
          }
          return max;
      }


      //Approach-2 TC: O(n * log(m))
      public int minEatingSpeed2(int[] piles, int h) {
          int start = 1;
          int end = Integer.MIN_VALUE;
          for(int i = 0; i < piles.length; i++){
              end = Math.max(high,piles[i]);
          }
          while(start<end){
              int mid = start + (end - start) / 2;
              if(blackbox(mid,piles,h)){
                  end = mid;
              }
              else
                  start = mid + 1;
          }
          return start;
      }
  
      public boolean blackbox(int maxpiles,int[] piles,int h){
          int hours = 0;
          for(int i:piles){
              int time = i / maxpiles;
              hours += time;

              if(i%maxpiles!=0) {
                  hours++;
              }
          }

          if(hours <= h) {
              return true;
          }
          return false;
      }




    //QUESTION-23 3Sum
    //Source-https://leetcode.com/problems/3sum/

    //METHOD-1 O(n^3)- Using 3 Loops- Taking all the cases nC3 where n is length of array.

    //Method-2 O(n^2), if sorted O(n^sq).
      public List<List<Integer>> threeSum(int[] nums) {
          int target = 0;
          Arrays.sort(nums);
          Set<List<Integer>> s = new HashSet<>();
          List<List<Integer>> output = new ArrayList<>();
          for (int i = 0; i < nums.length; i++){
              int j = i + 1;
              int k = nums.length - 1;
              while (j < k) {
                  int sum = nums[i] + nums[j] + nums[k];
                  if (sum == target) {
                      s.add(Arrays.asList(nums[i], nums[j], nums[k]));

                      /* TP-Once we get a answer, only j++/k-- is not going help. We
                         will have increase the sum from one side and decrease from
                         another to again get the target. */
                      j++;
                      k--;
                  }

                  else if (sum < target) {
                      /* TP- The Three Elements we have selected are giving sum < target.
                         It means we need a bigger number in the list, i.e j+1 */
                      j++;
                  }

                  else {
                      /* TP- The Three Elements we have selected are giving sum > target.
                         It means we need a smaller in the list, i.e k-1 */
                      k--;
                  }
              }
          }
          output.addAll(s);
          return output;
      }
      /* A4: BEGIN 23'(II)- After sorting we are taking those cases only that can give answer. We ignore
      some cases which are not going to give answers. Fixing one at time and checking j and k.
      Suppose: [-2, -1, 0, 1, 2, 3], Target = 1 -> [-2, -1, 3] If Sum == Target in this case, then all
      sets including [-2, -1, 2], [-2, -1, 1], [-2, -1, 0] are not taken. [-2, 0, 3] is considered as
      Target == Sum. Then [-2, 0, 2], [-2, 0, 1], [-2, 1, 3], [-2, 2, 3] are ignored. As these sets
      [-2, 0, 2] and [-2, 0, 1] will give Sum < Target always. [-2, 1, 3] and [-2, 2, 3] will give
      Sum > Target always. */




  
    //QUETSION-24 3 Sum Closest
    //Source-https://leetcode.com/problems/3sum-closest/

      public int threeSumClosest(int[] arr, int target) {
          Arrays.sort(arr);
          int ansSum =0;
          int minDiff = Integer.MAX_VALUE;
          for(int i = 0; i < arr.length ; i++) {
              int j=i+1;
              int k = arr.length-1;
              while(j<k){
                  int sum = arr[i]+ arr[j] + arr[k];
                  int diff = Math.abs(target-sum);
                  if(minDiff>diff){
                      minDiff = diff;
                      ansSum = sum;
                  }
                  if(sum>target){
                      k--;
                  }
                  else{
                      j++;
                  }
              }
          }
          return (ansSum);  
      }



  
    //QUESTION-25 Group Anagrams
    //Source-https://leetcode.com/problems/group-anagrams/

      public List<List<String>> groupAnagrams(String[] strs) {
           Map<String, ArrayList<String>> map = new HashMap<>();
          for (int i = 0; i < strs.length ; i++) {
              char[] chars = strs[i].toCharArray();
              Arrays.sort(chars);
              String sortedWord = new String(chars);

              if (!map.containsKey(sortedWord)) {
                  map.put(sortedWord, new ArrayList<>());
              }
              map.get(sortedWord).add(strs[i]);
          }
          return (new ArrayList<>(map.values()));
      }
      //Note: Anagram words if get lexiographiaclly sorted the they become same words.




    //QUESTION-26 Kth Largest Element in an Array
    //Source-https://leetcode.com/problems/kth-largest-element-in-an-array/

      //Approach-1 TC-O(n logn) && SC-O(1)
      public int findKthLargest1(int[] nums, int k) {
          Arrays.sort(nums);
          return (nums[nums.length-(k)]);
      }


      //Approach-2 TC-O(n) && SC-O(1)
      public int findKthLargest2(int[] nums, int k) {
          int[] count = new int[20001];

          for(int i = 0; i < nums.length; i++) {
              count[nums[i] + 10000]++;
          }

          for(int i = 20000; i >= 0; i--) {
              if(count[i] == 0) {
                  continue;
              }

              if(k - count[i] > 0) {
                  k -= count[i];
              }
              //Answer
              else {
                  return i - 10000;
              }
          }

          return 0;
      }
      /* T11: BUCKET ALGORITHM(NEGATIVE NUMBERS)- How to tackle negative numbers in this algorithm.
         If numbers ∈ (-100, 100), while index additon use count(nums[i] + 100 */




    //QUETSION-27 4Sum
    //Source-https://leetcode.com/problems/4sum/

      public List<List<Integer>> fourSum(int[] nums, int target) {
          Arrays.sort(nums);
          Set<List<Integer>> s = new HashSet<>();
          List<List<Integer>> output = new ArrayList<>();
          for (int i = 0; i < nums.length; i++) {
              for (int j = i + 1; j < nums.length; j++) {
                  int k = j + 1;
                  int l = nums.length - 1;
                  while (k < l) {
                      long sum = nums[i];
                      sum += nums[j];
                      sum += nums[k];
                      sum += nums[l];
                      if (sum == target) {
                          s.add(Arrays.asList(nums[i], nums[j], nums[k], nums[l]));
                          k++;
                          l--;
                      } else if (sum < target) {
                          k++;
                      } else {
                          l--;
                      }
                  }
              }
          }
          output.addAll(s);
          return output;
      }
      //TP- Same as 3Sum but now we are fixing 2 values using two for loops and checking with k and l.




    //QUESTION-28 Jump Games
    //Source-https://leetcode.com/problems/jump-game/

      public boolean canJump(int[] nums) {
          int n= nums.length;
          if (n==1){
              return true;
          }
          int max =0;
          for(int i=0;i<n-1 && max>=i; i++){
              if(max<i+nums[i]){
                  max = i + nums[i];
              }
              if(max>=n-1){
                  return true;
              }
          }
          return false;
      }




  //EXERCISE-4(35)

    //QUESTION-1 Min Cost Climbing Stairs
    //QUESTION-2 KnapSack Problem
    //QUESTION-3 House Robber
    //QUESTION-4 Cut Rod into Segments of X, Y, Z
    //QUESTION-5 Count Derangements
    //QUESTION-6 Maximum Value at a Given Index in a Bounded Array
    //QUESTION-7 Find a Peak Element II
    //QUESTION-8 Find Right Interval
    //QUESTION-9 Merge Intervals
    //QUESTION-10 Largest Number
    //QUESTION-11 Maximum Sum of Non-Adjacent Elements
    //QUESTION-12 Combination Sum Problem
    //QUESTION-13 Perfect Squares Problem
    //QUESTION-14 Min Cost for Tickets
    //QUESTION-15 Maximal Square
    //QUESTION-16 Min Score Triangulation of Polygon
    //QUESTION-17 Min Sideways Jump
    //QUESTION-18 Reducing Dishes
    //QUESTION-19 Longest Increasing Subsequences
    //QUESTION-20 Russian Doll
    //QUESTION-21 Max Height by Stacking Cuboids
    //QUESTION-22 Pizza with 3n Slices
    //QUESTION-23 Dice Throw
    //QUESTION-24 Partition Equal Subset Sum
    //QUESTION-25 Min Swaps To Make Subsequence Increasing
    //QUESTION-26 Longest Arithmetic Subsequence
    //QUESTION-27 Longest AP with given Difference "d"
    //QUESTION-28 Guess Number Higher or Lower
    //QUESTION-29 Minimum Cost Tree From Leaf Values
    //QUESTION-30 Buy and Sell Stock
    //QUESTION-31 Best Time to Buy and Sell Stock II
    //QUESTION-32 Best Time to Buy and Sell Stock III
    //QUESTION-33 Best Time to Buy and Sell Stock IV
    //QUESTION-34 Best Time to Buy and Sell Stock with Transaction Fee

    
    
    

    
      


    

  
  

      
    
    

      
    

    

    

  

  
    
      


      
  

      



  

      


  


    
  
    
    
    

  


  



  
}
